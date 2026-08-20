import Link from "next/link";
import { notFound } from "next/navigation";
import { listAllShiftsAction, deactivateShiftAction, activateShiftAction } from "@/actions/shift.actions";
import { listAllShiftChangeRequestsAction } from "@/actions/shiftRequest.actions";
import { getSessionContext } from "@/services/sessionService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteShiftButton } from "@/features/shifts/DeleteShiftButton";
import { AdminShiftRequestsTab } from "@/features/shifts/AdminShiftRequestsTab";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarSync, Layers } from "lucide-react";

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

function totalDurationMinutes(startMinutesOfDay: number, endMinutesOfDay: number): number {
  const raw = endMinutesOfDay - startMinutesOfDay;
  return raw > 0 ? raw : raw + 24 * 60;
}

function formatWeeklyOff(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "-";
  return value.map((d) => WEEKDAY_LABELS[Number(d)] ?? d).join(", ");
}

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSessionContext();
  if (!session || session.roleName !== "ADMIN") notFound();

  const params = await searchParams;
  const currentTab = params.tab === "requests" ? "requests" : "list";

  const [shifts, requests] = await Promise.all([
    listAllShiftsAction(),
    listAllShiftChangeRequestsAction(),
  ]);

  const pendingRequestsCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shift Management</h1>
          <p className="text-xs text-muted-foreground">Manage company shifts and employee shift change requests</p>
        </div>
        <div className="flex gap-2">
          {currentTab === "list" && (
            <Button asChild>
              <Link href="/admin/shifts/new">Add Shift</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <Button
          asChild
          variant={currentTab === "list" ? "default" : "outline"}
          size="sm"
          className="rounded-xl text-xs gap-1.5"
        >
          <Link href="/admin/shifts">
            <Layers className="size-3.5" />
            All Shifts ({shifts.length})
          </Link>
        </Button>

        <Button
          asChild
          variant={currentTab === "requests" ? "default" : "outline"}
          size="sm"
          className={`rounded-xl text-xs gap-1.5 ${
            currentTab !== "requests" && pendingRequestsCount > 0
              ? "border-brand-orange/40 text-brand-orange bg-brand-orange/5"
              : ""
          }`}
        >
          <Link href="/admin/shifts?tab=requests">
            <CalendarSync className="size-3.5" />
            Shift Requests
            {pendingRequestsCount > 0 && (
              <span className="ml-1 rounded-full bg-brand-orange px-1.5 py-0.2 text-[10px] font-bold text-white">
                {pendingRequestsCount}
              </span>
            )}
          </Link>
        </Button>
      </div>

      {currentTab === "requests" ? (
        <AdminShiftRequestsTab initialRequests={requests} />
      ) : (


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
                  {formatTime(shift.startMinutesOfDay)} - {formatTime(shift.endMinutesOfDay)}
                </TableCell>
                <TableCell>{formatDuration(totalMin)}</TableCell>
                <TableCell>{shift.breakAllowanceMin != null ? formatDuration(breakMin) : "-"}</TableCell>
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
      )}
    </div>
  );
}

