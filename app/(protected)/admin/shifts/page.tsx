import Link from "next/link";
import { redirect } from "next/navigation";
import { listAllShiftsAction, deactivateShiftAction, activateShiftAction } from "@/actions/shift.actions";
import { getSessionContext } from "@/services/sessionService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteShiftButton } from "@/features/shifts/DeleteShiftButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(minutes: number): string {
  const rawHour = Math.floor(minutes / 60) % 24;
  const m = (minutes % 60).toString().padStart(2, "0");
  const period = rawHour < 12 ? "AM" : "PM";
  const hour12 = rawHour % 12 === 0 ? 12 : rawHour % 12;
  return `${hour12}:${m} ${period}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// A shift "crosses midnight" when its end-of-day minute isn't after its start
// (e.g. 21:00 -> 06:00) — total duration then wraps through 24:00.
function totalDurationMinutes(startMinutesOfDay: number, endMinutesOfDay: number): number {
  const raw = endMinutesOfDay - startMinutesOfDay;
  return raw > 0 ? raw : raw + 24 * 60;
}

function formatWeeklyOff(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "—";
  return value.map((d) => WEEKDAY_LABELS[Number(d)] ?? d).join(", ");
}

export default async function ShiftsPage() {
  const session = await getSessionContext();
  if (!session || session.roleName !== "ADMIN") redirect("/dashboard");

  const shifts = await listAllShiftsAction();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Shifts</h1>
        <Button asChild>
          <Link href="/admin/shifts/new">Add Shift</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Working Time</TableHead>
            <TableHead>Total Duration</TableHead>
            <TableHead>Break</TableHead>
            <TableHead>Net Hours</TableHead>
            <TableHead>Weekly Off</TableHead>
            <TableHead>Employees</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => {
            const totalMin = totalDurationMinutes(shift.startMinutesOfDay, shift.endMinutesOfDay);
            const breakMin = shift.breakAllowanceMin ?? 0;
            const netMin = Math.max(0, totalMin - breakMin);
            return (
              <TableRow key={shift.id}>
                <TableCell>{shift.name}</TableCell>
                <TableCell>
                  {formatTime(shift.startMinutesOfDay)}–{formatTime(shift.endMinutesOfDay)}
                </TableCell>
                <TableCell>{formatDuration(totalMin)}</TableCell>
                <TableCell>{shift.breakAllowanceMin != null ? formatDuration(breakMin) : "—"}</TableCell>
                <TableCell>{formatDuration(netMin)}</TableCell>
                <TableCell>{formatWeeklyOff(shift.weeklyOff)}</TableCell>
                <TableCell>
                  <Link href={`/admin/employees?shiftId=${shift.id}`} className="text-primary hover:underline">
                    {shift.employeeCount}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={shift.isActive ? "default" : "secondary"}>
                    {shift.isActive ? "ACTIVE" : "INACTIVE"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/shifts/${shift.id}/edit`}>Edit</Link>
                    </Button>
                    {shift.isActive ? (
                      <form
                        action={async () => {
                          "use server";
                          await deactivateShiftAction(shift.id);
                        }}
                      >
                        <Button type="submit" variant="outline" size="sm">
                          Deactivate
                        </Button>
                      </form>
                    ) : (
                      <form
                        action={async () => {
                          "use server";
                          await activateShiftAction(shift.id);
                        }}
                      >
                        <Button type="submit" variant="outline" size="sm">
                          Activate
                        </Button>
                      </form>
                    )}
                    <DeleteShiftButton shiftId={shift.id} shiftName={shift.name} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {shifts.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground">
                No shifts yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
