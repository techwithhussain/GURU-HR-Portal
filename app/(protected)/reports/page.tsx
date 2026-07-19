import Link from "next/link";
import { DateTime } from "luxon";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import { getAttendanceReport, getLeaveReport, getCompanyTimezone } from "@/services/reportsService";
import { listDepartments, listDesignations, listEmployees } from "@/services/orgService";
import { listShifts } from "@/services/shiftService";
import { listLeaveTypes } from "@/services/leaveTypeService";
import { reportFiltersSchema } from "@/lib/validation/report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ToggleWeeklyOffButton } from "@/features/reports/ToggleWeeklyOffButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const STATUS_OPTIONS = ["PRESENT", "LATE", "HALF_DAY", "ABSENT", "ON_LEAVE", "HOLIDAY", "WEEKLY_OFF"] as const;
const LEAVE_STATUS_OPTIONS = ["APPLIED", "APPROVED", "REJECTED", "CANCELLED"] as const;

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PRESENT: "default",
  LATE: "outline",
  HALF_DAY: "secondary",
  ABSENT: "destructive",
  ON_LEAVE: "secondary",
  HOLIDAY: "secondary",
  WEEKLY_OFF: "secondary",
};

const LEAVE_STATUS_CLASS: Record<string, string> = {
  APPLIED: "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-blue-100 text-blue-700 border-blue-200",
};

function firstDayOfMonth(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function lastDayOfMonth(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatMinutes(min: number | null): string {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatClock(iso: string, timezone: string): string {
  if (!iso) return "—";
  return DateTime.fromISO(iso).setZone(timezone).toFormat("h:mm a");
}

const LEAVE_COLUMNS = [
  { key: "employeeCode", label: "Employee ID" },
  { key: "employeeName", label: "Employee" },
  { key: "department", label: "Department" },
  { key: "designation", label: "Designation" },
  { key: "type", label: "Type" },
  { key: "startDate", label: "Start" },
  { key: "endDate", label: "End" },
  { key: "days", label: "Days" },
  { key: "reason", label: "Reason" },
  { key: "status", label: "Status" },
] as const;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const session = await getSessionContext();
  if (!session) return null;

  const timezone = await getCompanyTimezone();

  const type = params.type === "leave" ? "leave" : "attendance";
  const startDate = params.startDate || firstDayOfMonth();
  const endDate = params.endDate || lastDayOfMonth();

  const canFilterAll = hasPermission(session, "reports.view.all");

  const [employees, departments, designations, shifts, leaveTypes] = await Promise.all([
    canFilterAll ? listEmployees() : Promise.resolve([]),
    canFilterAll ? listDepartments() : Promise.resolve([]),
    canFilterAll ? listDesignations() : Promise.resolve([]),
    canFilterAll ? listShifts() : Promise.resolve([]),
    listLeaveTypes(),
  ]);

  const parsedFilters = reportFiltersSchema.safeParse({
    startDate,
    endDate,
    employeeId: params.employeeId || undefined,
    departmentId: params.departmentId || undefined,
    designationId: params.designationId || undefined,
    shiftId: params.shiftId || undefined,
    leaveTypeId: params.leaveTypeId || undefined,
    status: params.status || undefined,
  });

  const attendanceRows =
    parsedFilters.success && type === "attendance" ? await getAttendanceReport(parsedFilters.data, session) : [];
  const leaveRows =
    parsedFilters.success && type === "leave" ? await getLeaveReport(parsedFilters.data, session) : [];

  const exportQuery = new URLSearchParams({
    startDate,
    endDate,
    ...(params.employeeId ? { employeeId: params.employeeId } : {}),
    ...(params.departmentId ? { departmentId: params.departmentId } : {}),
    ...(params.designationId ? { designationId: params.designationId } : {}),
    ...(params.shiftId ? { shiftId: params.shiftId } : {}),
    ...(params.leaveTypeId ? { leaveTypeId: params.leaveTypeId } : {}),
    ...(params.status ? { status: params.status } : {}),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>

      <div className="flex gap-4 border-b border-border/50 text-sm">
        <Link
          href={`/reports?type=attendance&startDate=${startDate}&endDate=${endDate}`}
          className={`pb-2 ${type === "attendance" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
        >
          Attendance
        </Link>
        <Link
          href={`/reports?type=leave&startDate=${startDate}&endDate=${endDate}`}
          className={`pb-2 ${type === "leave" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
        >
          Leave
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="type" value={type} />
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" defaultValue={startDate} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" defaultValue={endDate} />
        </div>
        {canFilterAll && (
          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee</Label>
            <select id="employeeId" name="employeeId" className={selectClass} defaultValue={params.employeeId ?? ""}>
              <option value="">All</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </div>
        )}
        {canFilterAll && (
          <div className="space-y-2">
            <Label htmlFor="departmentId">Department</Label>
            <select
              id="departmentId"
              name="departmentId"
              className={selectClass}
              defaultValue={params.departmentId ?? ""}
            >
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {canFilterAll && (
          <div className="space-y-2">
            <Label htmlFor="designationId">Designation</Label>
            <select
              id="designationId"
              name="designationId"
              className={selectClass}
              defaultValue={params.designationId ?? ""}
            >
              <option value="">All</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {canFilterAll && type === "attendance" && (
          <div className="space-y-2">
            <Label htmlFor="shiftId">Shift</Label>
            <select id="shiftId" name="shiftId" className={selectClass} defaultValue={params.shiftId ?? ""}>
              <option value="">All</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {type === "leave" && (
          <div className="space-y-2">
            <Label htmlFor="leaveTypeId">Leave Type</Label>
            <select id="leaveTypeId" name="leaveTypeId" className={selectClass} defaultValue={params.leaveTypeId ?? ""}>
              <option value="">All</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select id="status" name="status" className={selectClass} defaultValue={params.status ?? ""}>
            <option value="">All</option>
            {(type === "attendance" ? STATUS_OPTIONS : LEAVE_STATUS_OPTIONS).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {!parsedFilters.success && (
        <p role="alert" className="text-sm text-destructive">
          {parsedFilters.error.issues[0]?.message ?? "Invalid filters"}
        </p>
      )}

      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={`/api/reports/${type}?${exportQuery.toString()}&format=csv`}>Export CSV</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/reports/${type}?${exportQuery.toString()}&format=xlsx`}>Export Excel</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/reports/${type}?${exportQuery.toString()}&format=pdf`}>Export PDF</a>
        </Button>
      </div>

      {type === "attendance" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Login Date</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Logout</TableHead>
              <TableHead>Working</TableHead>
              <TableHead>Break</TableHead>
              <TableHead>Late</TableHead>
              <TableHead>OT</TableHead>
              <TableHead>Status</TableHead>
              {canFilterAll && <TableHead className="print:hidden text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceRows.map((row) => (
              <TableRow key={row.attendanceId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-brand-orange-light text-[10px] font-semibold text-white">
                      {initials(row.employeeName)}
                    </div>
                    <div className="flex flex-col leading-tight">
                      {canFilterAll && !row.attendanceId.startsWith("dynamic_") ? (
                        <Link href={`/reports/attendance/${row.attendanceId}`} className="font-medium hover:underline">
                          {row.employeeName}
                        </Link>
                      ) : (
                        <span className="font-medium">{row.employeeName}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{row.employeeCode}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell>{row.designation}</TableCell>
                <TableCell>{row.shiftName}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell>{formatClock(row.checkInAt, timezone)}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1">
                    {formatClock(row.checkOutAt, timezone)}
                    {/* Show +1 badge when logout is on the next calendar day (night shift) */}
                    {row.checkOutAt && row.logoutDate && row.logoutDate !== row.date && (
                      <span
                        className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                        title={`Logout on ${row.logoutDate}`}
                      >
                        +1
                      </span>
                    )}
                  </span>
                </TableCell>
                <TableCell>{formatMinutes(row.workingMinutes)}</TableCell>
                <TableCell>{formatMinutes(row.breakMinutes)}</TableCell>
                <TableCell>{row.lateMinutes > 0 ? `${row.lateMinutes}m` : "—"}</TableCell>
                <TableCell>{row.overtimeMinutes > 0 ? `${row.overtimeMinutes}m` : "—"}</TableCell>
                 <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[row.status] ?? "outline"}>{row.status}</Badge>
                </TableCell>
                {canFilterAll && (
                  <TableCell className="print:hidden text-right">
                    <ToggleWeeklyOffButton
                      employeeId={row.employeeId}
                      dateStr={row.date}
                      isWeeklyOff={row.status === "WEEKLY_OFF"}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
            {attendanceRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-muted-foreground">
                  No records for this range.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {LEAVE_COLUMNS.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaveRows.map((row, i) => (
              <TableRow key={i}>
                {LEAVE_COLUMNS.map((col) =>
                  col.key === "status" ? (
                    <TableCell key={col.key}>
                      <Badge variant="outline" className={LEAVE_STATUS_CLASS[row.status]}>
                        {row.status}
                      </Badge>
                    </TableCell>
                  ) : (
                    <TableCell key={col.key}>
                      {String((row as unknown as Record<string, unknown>)[col.key] ?? "—")}
                    </TableCell>
                  ),
                )}
              </TableRow>
            ))}
            {leaveRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={LEAVE_COLUMNS.length} className="text-center text-muted-foreground">
                  No records for this range.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
