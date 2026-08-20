import { notFound } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { getAttendanceStatusAction, getOvertimeStatusAction } from "@/actions/attendance.actions";
import { getMyDashboardProfileAction, getMyDashboardStatsAction } from "@/actions/dashboard.actions";
import { getCompanyTimezone } from "@/services/reportsService";
import {
  getUpcomingBirthdays,
  getBirthdaysForMonth,
  dispatchBirthdayNotifications,
} from "@/services/birthdayService";
import { getActiveAnnouncements } from "@/services/announcementService";
import { listShifts } from "@/services/shiftService";
import { getMyShiftChangeRequestsAction } from "@/actions/shiftRequest.actions";
import { getMyAttendanceCorrectionsAction } from "@/actions/attendanceCorrection.actions";
import { CheckInPanel } from "@/features/attendance/CheckInPanel";
import { OvertimePanel } from "@/features/attendance/OvertimePanel";
import { HeroBanner } from "@/features/dashboard/HeroBanner";
import { StatCards } from "@/features/dashboard/StatCards";
import { AttendanceCalendar } from "@/features/dashboard/AttendanceCalendar";
import { QuickActions } from "@/features/dashboard/QuickActions";
import { AnnouncementsCard } from "@/features/dashboard/CompanyNewsPlaceholder";
import { UpcomingBirthdaysCard } from "@/features/dashboard/UpcomingBirthdaysCard";
import { BirthdaysThisMonthCard } from "@/features/dashboard/BirthdaysThisMonthCard";
import { EmployeeShiftRequestModal } from "@/features/shifts/EmployeeShiftRequestModal";
import { EmployeeAttendanceCorrectionModal } from "@/features/attendance/EmployeeAttendanceCorrectionModal";

export default async function DashboardPage() {
  const session = await getSessionContext();
  // Middleware already handles: unauthenticated → /login, admin → /admin/dashboard
  if (!session) notFound();

  const [status, overtimeStatus, profile, stats, timezone, allShifts, myShiftRequests, myAttendanceCorrections] =
    await Promise.all([
      getAttendanceStatusAction(),
      getOvertimeStatusAction(),
      getMyDashboardProfileAction(),
      getMyDashboardStatsAction(),
      getCompanyTimezone(),
      listShifts(),
      getMyShiftChangeRequestsAction(),
      getMyAttendanceCorrectionsAction(),
    ]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

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

      {/* Quick Employee Self-Service Request Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-soft">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs">
            ⚡
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Self-Service Requests</p>
            <p className="text-[11px] text-muted-foreground">
              Request shift updates or fix missed punch times with 1 click
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EmployeeShiftRequestModal
            currentShift={profile.shift}
            availableShifts={allShifts}
            history={myShiftRequests}
          />
          <EmployeeAttendanceCorrectionModal history={myAttendanceCorrections} />
        </div>
      </div>

      <CheckInPanel status={status} shift={profile.shift} timezone={timezone} />

      <OvertimePanel overtimeStatus={overtimeStatus} timezone={timezone} />

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
