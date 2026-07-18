import { redirect } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import {
  getDashboardSummaryAction,
  getEmployeesOnBreakAction,
  getEmployeesWorkingAction,
  getShiftBreakdownAction,
} from "@/actions/dashboard.actions";
import { EmployeesOnBreakWidget } from "@/features/dashboard/EmployeesOnBreakWidget";
import { EmployeesWorkingWidget } from "@/features/dashboard/EmployeesWorkingWidget";
import { AdminDashboardStats } from "@/features/dashboard/AdminDashboardStats";
import { AdminAttendanceCalendar } from "@/features/dashboard/AdminAttendanceCalendar";
import { ShiftBreakdownTable } from "@/features/dashboard/ShiftBreakdownTable";

export default async function AdminDashboardPage() {
  const session = await getSessionContext();
  if (!session || !hasPermission(session, "reports.view.all")) redirect("/dashboard");

  const [summary, employeesOnBreak, employeesWorking, shiftBreakdown] = await Promise.all([
    getDashboardSummaryAction(),
    getEmployeesOnBreakAction(),
    getEmployeesWorkingAction(),
    getShiftBreakdownAction(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
      <AdminDashboardStats initialData={summary} />
      <ShiftBreakdownTable initialData={shiftBreakdown} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EmployeesWorkingWidget initialData={employeesWorking} />
        <EmployeesOnBreakWidget initialData={employeesOnBreak} />
      </div>
      <AdminAttendanceCalendar />
    </div>
  );
}
