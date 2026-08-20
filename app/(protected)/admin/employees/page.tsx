import Link from "next/link";
import { notFound } from "next/navigation";
import { Users, UserCheck, UserX, Palmtree, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import {
  getEmployeeManagementStatsAction,
  searchEmployeesAction,
} from "@/actions/employee.actions";
import { listDepartments, listDesignations } from "@/services/orgService";
import { listShifts } from "@/services/shiftService";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { EmployeeTable } from "@/features/employees/EmployeeTable";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "RESIGNED"] as const;
const ATTENDANCE_STATUS_OPTIONS = ["PRESENT", "LATE", "HALF_DAY", "ABSENT", "ON_LEAVE", "HOLIDAY", "WEEKLY_OFF"] as const;
const SORT_OPTIONS = [
  { value: "fullName", label: "Name" },
  { value: "joiningDate", label: "Joining Date" },
  { value: "department", label: "Department" },
  { value: "employeeCode", label: "Employee ID" },
] as const;

const STAT_TILES = [
  { key: "totalEmployees", label: "Total Employees", icon: Users, accent: "bg-blue-100 text-blue-600" },
  { key: "activeCount", label: "Active Employees", icon: UserCheck, accent: "bg-emerald-100 text-emerald-600" },
  { key: "inactiveCount", label: "Inactive Employees", icon: UserX, accent: "bg-red-100 text-red-600" },
  { key: "onLeaveToday", label: "On Leave Today", icon: Palmtree, accent: "bg-amber-100 text-amber-600" },
  { key: "presentToday", label: "Present Today", icon: CheckCircle2, accent: "bg-teal-100 text-teal-600" },
  { key: "absentToday", label: "Absent Today", icon: XCircle, accent: "bg-rose-100 text-rose-600" },
  { key: "newThisMonth", label: "New This Month", icon: UserPlus, accent: "bg-violet-100 text-violet-600" },
] as const;

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSessionContext();
  if (!session || session.roleName !== "ADMIN") notFound();

  const params = await searchParams;
  const canViewSalary = hasPermission(session, "salary.view");

  const [stats, departments, designations, shifts] = await Promise.all([
    getEmployeeManagementStatsAction(),
    listDepartments(),
    listDesignations(),
    listShifts(),
  ]);

  const page = params.page ? Number(params.page) : 1;
  const { items, total, pageSize } = await searchEmployeesAction({
    query: params.query || undefined,
    departmentId: params.departmentId || undefined,
    designationId: params.designationId || undefined,
    shiftId: params.shiftId || undefined,
    status: params.status || undefined,
    attendanceStatus: params.attendanceStatus || undefined,
    joiningDateFrom: params.joiningDateFrom || undefined,
    joiningDateTo: params.joiningDateTo || undefined,
    sortBy: params.sortBy || undefined,
    sortDir: params.sortDir || undefined,
    page,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportQuery = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([k, v]) => k !== "page" && v)) as Record<string, string>,
  );

  function buildHref(targetPage: number): string {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>);
    q.set("page", String(targetPage));
    return `/admin/employees?${q.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/employees/import">Bulk Import</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/employees/new">Add Employee</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {STAT_TILES.map(({ key, label, icon: Icon, accent }) => (
          <Card key={key} className="transition-shadow hover:shadow-elevated">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${accent}`}>
                <Icon className="size-4.5" />
              </span>
              <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{stats[key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="query">Search</Label>
          <Input id="query" name="query" placeholder="Name, ID, email, phone..." defaultValue={params.query ?? ""} className="w-56" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="departmentId">Department</Label>
          <select id="departmentId" name="departmentId" className={selectClass} defaultValue={params.departmentId ?? ""}>
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="designationId">Designation</Label>
          <select id="designationId" name="designationId" className={selectClass} defaultValue={params.designationId ?? ""}>
            <option value="">All</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
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
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select id="status" name="status" className={selectClass} defaultValue={params.status ?? ""}>
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="attendanceStatus">Today&apos;s Attendance</Label>
          <select id="attendanceStatus" name="attendanceStatus" className={selectClass} defaultValue={params.attendanceStatus ?? ""}>
            <option value="">All</option>
            {ATTENDANCE_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="joiningDateFrom">Joined From</Label>
          <Input id="joiningDateFrom" name="joiningDateFrom" type="date" defaultValue={params.joiningDateFrom ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="joiningDateTo">Joined To</Label>
          <Input id="joiningDateTo" name="joiningDateTo" type="date" defaultValue={params.joiningDateTo ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sortBy">Sort By</Label>
          <select id="sortBy" name="sortBy" className={selectClass} defaultValue={params.sortBy ?? "fullName"}>
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sortDir">Order</Label>
          <select id="sortDir" name="sortDir" className={selectClass} defaultValue={params.sortDir ?? "asc"}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={`/api/employees/export?${exportQuery.toString()}&format=csv`}>Export CSV</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/employees/export?${exportQuery.toString()}&format=xlsx`}>Export Excel</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/employees/export?${exportQuery.toString()}&format=pdf`}>Export PDF</a>
        </Button>
      </div>

      <EmployeeTable
        items={items.map((e) => ({
          ...e,
          salary: e.salary != null ? Number(e.salary) : null,
          allowances: e.allowances != null ? Number(e.allowances) : null,
          deductions: e.deductions != null ? Number(e.deductions) : null,
        }))}
        canViewSalary={canViewSalary}
        shifts={shifts}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} employee{total === 1 ? "" : "s"} - page {page} of {totalPages}
        </p>
        <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
      </div>
    </div>
  );
}
