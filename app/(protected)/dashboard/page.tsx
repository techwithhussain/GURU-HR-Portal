import { redirect } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { getAttendanceStatusAction } from "@/actions/attendance.actions";
import { getMyDashboardProfileAction, getMyDashboardStatsAction } from "@/actions/dashboard.actions";
import { getCompanyTimezone } from "@/services/reportsService";
import { CheckInPanel } from "@/features/attendance/CheckInPanel";
import { HeroBanner } from "@/features/dashboard/HeroBanner";
import { StatCards } from "@/features/dashboard/StatCards";
import { AttendanceCalendar } from "@/features/dashboard/AttendanceCalendar";
import { QuickActions } from "@/features/dashboard/QuickActions";
import { TodaysTasksPlaceholder } from "@/features/dashboard/TodaysTasksPlaceholder";
import { CompanyNewsPlaceholder } from "@/features/dashboard/CompanyNewsPlaceholder";

export default async function DashboardPage() {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  if (session.roleName === "ADMIN") redirect("/admin/dashboard");

  const [status, profile, stats, timezone] = await Promise.all([
    getAttendanceStatusAction(),
    getMyDashboardProfileAction(),
    getMyDashboardStatsAction(),
    getCompanyTimezone(),
  ]);

  return (
    <div className="space-y-6">
      <HeroBanner
        fullName={profile.fullName}
        employeeCode={session?.employeeCode ?? ""}
        departmentName={profile.departmentName}
        shift={profile.shift}
      />

      <CheckInPanel status={status} shift={profile.shift} timezone={timezone} />

      <StatCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AttendanceCalendar />
          <CompanyNewsPlaceholder />
        </div>
        <div className="space-y-6">
          <QuickActions />
          <TodaysTasksPlaceholder />
        </div>
      </div>
    </div>
  );
}
