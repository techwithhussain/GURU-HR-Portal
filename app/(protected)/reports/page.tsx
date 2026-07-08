import Link from "next/link";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import { getAttendanceReport, getLeaveReport } from "@/services/reportsService";
import { listDepartments, listEmployees } from "@/services/orgService";
import { reportFiltersSchema } from "@/lib/validation/report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function firstDayOfMonth(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function lastDayOfMonth(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}

const ATTENDANCE_COLUMNS = [
  { key: "employeeName", label: "Employee" },
  { key: "department", label: "Department" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
  { key: "workingMinutes", label: "Working (min)" },
  { key: "lateMinutes", label: "Late (min)" },
  { key: "overtimeMinutes", label: "OT (min)" },
] as const;

const LEAVE_COLUMNS = [
  { key: "employeeName", label: "Employee" },
  { key: "department", label: "Department" },
  { key: "type", label: "Type" },
  { key: "startDate", label: "Start" },
  { key: "endDate", label: "End" },
  { key: "days", label: "Days" },
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

  const type = params.type === "leave" ? "leave" : "attendance";
  const startDate = params.startDate || firstDayOfMonth();
  const endDate = params.endDate || lastDayOfMonth();

  const canFilterByEmployee = hasPermission(session, "reports.view.all");
  const canFilterByDepartment = hasPermission(session, "reports.view.all");

  const [employees, departments] = await Promise.all([
    canFilterByEmployee ? listEmployees() : Promise.resolve([]),
    canFilterByDepartment ? listDepartments() : Promise.resolve([]),
  ]);

  const parsedFilters = reportFiltersSchema.safeParse({
    startDate,
    endDate,
    employeeId: params.employeeId || undefined,
    departmentId: params.departmentId || undefined,
  });

  const rows = parsedFilters.success
    ? type === "leave"
      ? await getLeaveReport(parsedFilters.data, session)
      : await getAttendanceReport(parsedFilters.data, session)
    : [];

  const exportQuery = new URLSearchParams({
    startDate,
    endDate,
    ...(params.employeeId ? { employeeId: params.employeeId } : {}),
    ...(params.departmentId ? { departmentId: params.departmentId } : {}),
  });

  const columns = type === "leave" ? LEAVE_COLUMNS : ATTENDANCE_COLUMNS;

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
        {canFilterByEmployee && (
          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee</Label>
            <select
              id="employeeId"
              name="employeeId"
              className={selectClass}
              defaultValue={params.employeeId ?? ""}
            >
              <option value="">All</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </div>
        )}
        {canFilterByDepartment && (
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
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col.key}>
                  {String((row as unknown as Record<string, unknown>)[col.key] ?? "—")}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                No records for this range.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
