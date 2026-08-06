import { redirect } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { getAttendanceStatusAction } from "@/actions/attendance.actions";
import { getMyDashboardProfileAction, getMyDashboardStatsAction } from "@/actions/dashboard.actions";
import { getCompanyTimezone } from "@/services/reportsService";
import {
  getUpcomingBirthdays,
  getBirthdaysForMonth,
  dispatchBirthdayNotifications,
} from "@/services/birthdayService";
import { getActiveAnnouncements } from "@/services/announcementService";
import { CheckInPanel } from "@/features/attendance/CheckInPanel";
import { HeroBanner } from "@/features/dashboard/HeroBanner";
import { StatCards } from "@/features/dashboard/StatCards";
import { AttendanceCalendar } from "@/features/dashboard/AttendanceCalendar";
import { QuickActions } from "@/features/dashboard/QuickActions";
import { AnnouncementsCard } from "@/features/dashboard/CompanyNewsPlaceholder";
import { UpcomingBirthdaysCard } from "@/features/dashboard/UpcomingBirthdaysCard";
import { BirthdaysThisMonthCard } from "@/features/dashboard/BirthdaysThisMonthCard";

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

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Fetch upcoming birthdays, this-month birthdays, announcements & dispatch notifications in parallel
  const [upcomingBirthdays, thisMonthBirthdays, announcements] = await Promise.all([
    getUpcomingBirthdays(timezone, session.employeeId ?? undefined),
    getBirthdaysForMonth(currentMonth, currentYear, timezone),
    getActiveAnnouncements(),
    dispatchBirthdayNotifications(session, timezone),
  ]);

  return (
    <div className="space-y-6">
      <HeroBanner
        fullName={profile.fullName}
        employeeCode={session?.employeeCode ?? ""}
        departmentName={profile.departmentName}
        shift={profile.shift}
        timezone={timezone}
        joiningDate={profile.joiningDate}
        dateOfBirth={profile.dateOfBirth}
      />

      <CheckInPanel status={status} shift={profile.shift} timezone={timezone} />

      <StatCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AttendanceCalendar />
          <AnnouncementsCard announcements={announcements} />
        </div>
        <div className="space-y-6">
          <UpcomingBirthdaysCard birthdays={upcomingBirthdays} />
          <QuickActions />
          <BirthdaysThisMonthCard
            initialBirthdays={thisMonthBirthdays}
            initialMonth={currentMonth}
            initialYear={currentYear}
          />
        </div>
      </div>
    </div>
  );
}
