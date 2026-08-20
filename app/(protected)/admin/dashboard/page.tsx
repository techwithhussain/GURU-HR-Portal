import { notFound } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import {
  getDashboardSummaryAction,
  getEmployeesOnBreakAction,
  getEmployeesWorkingAction,
  getShiftBreakdownAction,
} from "@/actions/dashboard.actions";
import { listShifts, listActiveEmployeesWithShifts } from "@/services/shiftService";
import { listAllAttendanceCorrectionsAction } from "@/actions/attendanceCorrection.actions";
import { getCompanyTimezone } from "@/services/reportsService";
import { EmployeesOnBreakWidget } from "@/features/dashboard/EmployeesOnBreakWidget";
import { EmployeesWorkingWidget } from "@/features/dashboard/EmployeesWorkingWidget";
import { AdminDashboardStats } from "@/features/dashboard/AdminDashboardStats";
import { AdminAttendanceCalendar } from "@/features/dashboard/AdminAttendanceCalendar";
import { ShiftBreakdownTable } from "@/features/dashboard/ShiftBreakdownTable";
import { QuickShiftSwitcherWidget } from "@/features/dashboard/QuickShiftSwitcherWidget";
import { AdminAttendanceCorrectionTab } from "@/features/attendance/AdminAttendanceCorrectionTab";

export default async function AdminDashboardPage() {
  const session = await getSessionContext();
  if (!session || !hasPermission(session, "reports.view.all")) notFound();

  const [
    summary,
    employeesOnBreak,
    employeesWorking,
    shiftBreakdown,
    timezone,
    shifts,
    activeEmployees,
    attendanceCorrections,
  ] = await Promise.all([
    getDashboardSummaryAction(),
    getEmployeesOnBreakAction(),
    getEmployeesWorkingAction(),
    getShiftBreakdownAction(),
    getCompanyTimezone(),
    listShifts(),
    listActiveEmployeesWithShifts(),
    listAllAttendanceCorrectionsAction(),
  ]);

  const pendingCorrectionCount = attendanceCorrections.filter((c) => c.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
      </div>
      <AdminDashboardStats initialData={summary} />

      {/* Attendance Correction Requests (When pending or reviewed) */}
      {attendanceCorrections.length > 0 && (
        <AdminAttendanceCorrectionTab initialRequests={attendanceCorrections} />
      )}

      <QuickShiftSwitcherWidget initialEmployees={activeEmployees} shifts={shifts} />
      <ShiftBreakdownTable initialData={shiftBreakdown} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EmployeesWorkingWidget initialData={employeesWorking} timezone={timezone} />
        <EmployeesOnBreakWidget initialData={employeesOnBreak} />
      </div>
      <AdminAttendanceCalendar />
    </div>
  );
}
