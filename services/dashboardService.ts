import "server-only";
import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/permissions";
import { attendanceDateForCheckIn } from "@/lib/attendance/calculations";
import { holidaySchema } from "@/lib/validation/companySettings";
import type { SessionContext } from "@/types/session";

async function getCompanyTimezone(): Promise<string> {
  const settings = await prisma.companySetting.findFirst({ select: { timezone: true } });
  return settings?.timezone ?? "Asia/Kolkata";
}

export interface DashboardSummary {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  onBreakNow: number;
  workingNow: number;
  checkedOutToday: number;
  absentToday: number;
}

export async function getDashboardSummary(actor: SessionContext): Promise<DashboardSummary> {
  requirePermission(actor, "reports.view.all");

  const timezone = await getCompanyTimezone();
  const today = attendanceDateForCheckIn(new Date(), timezone);

  const [totalEmployees, statusCounts, checkedInTodayCount, checkedOutTodayCount, onBreakNow] =
    await Promise.all([
      prisma.employee.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.attendance.groupBy({
        by: ["status"],
        where: { attendanceDate: today },
        _count: true,
      }),
      prisma.attendance.count({ where: { attendanceDate: today, checkInAt: { not: null } } }),
      prisma.attendance.count({ where: { attendanceDate: today, checkOutAt: { not: null } } }),
      prisma.break.count({ where: { endAt: null, attendance: { attendanceDate: today } } }),
    ]);

  const presentToday = statusCounts.find((s) => s.status === "PRESENT")?._count ?? 0;
  const lateToday = statusCounts.find((s) => s.status === "LATE")?._count ?? 0;

  return {
    totalEmployees,
    presentToday,
    lateToday,
    onBreakNow,
    workingNow: checkedInTodayCount - checkedOutTodayCount - onBreakNow,
    checkedOutToday: checkedOutTodayCount,
    absentToday: totalEmployees - checkedInTodayCount,
  };
}

export interface EmployeeOnBreak {
  employeeId: string;
  employeeName: string;
  departmentName: string | null;
  breakType: string;
  startAt: string;
}

export async function getEmployeesOnBreak(actor: SessionContext): Promise<EmployeeOnBreak[]> {
  requirePermission(actor, "reports.view.all");

  const timezone = await getCompanyTimezone();
  const today = attendanceDateForCheckIn(new Date(), timezone);

  const rows = await prisma.break.findMany({
    where: { endAt: null, attendance: { attendanceDate: today } },
    select: {
      type: true,
      startAt: true,
      attendance: {
        select: {
          employee: { select: { id: true, fullName: true, department: { select: { name: true } } } },
        },
      },
    },
    orderBy: { startAt: "asc" },
  });

  return rows.map((row) => ({
    employeeId: row.attendance.employee.id,
    employeeName: row.attendance.employee.fullName,
    departmentName: row.attendance.employee.department?.name ?? null,
    breakType: row.type,
    startAt: row.startAt.toISOString(),
  }));
}

export interface MyDashboardProfile {
  fullName: string;
  departmentName: string | null;
  designationName: string | null;
  profileImageUrl: string | null;
  shift: { name: string; startMinutesOfDay: number; endMinutesOfDay: number } | null;
}

function requireEmployeeId(actor: SessionContext): string {
  if (!actor.employeeId) throw new Error("No employee profile linked to this account");
  return actor.employeeId;
}

export async function getMyDashboardProfile(actor: SessionContext): Promise<MyDashboardProfile> {
  const employeeId = requireEmployeeId(actor);

  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: employeeId },
    select: {
      fullName: true,
      profileImageUrl: true,
      department: { select: { name: true } },
      designation: { select: { name: true } },
      shift: { select: { name: true, startMinutesOfDay: true, endMinutesOfDay: true } },
    },
  });

  return {
    fullName: employee.fullName,
    departmentName: employee.department?.name ?? null,
    designationName: employee.designation?.name ?? null,
    profileImageUrl: employee.profileImageUrl,
    shift: employee.shift,
  };
}

export interface MyDashboardStats {
  presentDaysThisMonth: number;
  workingDaysElapsedThisMonth: number;
  workingMinutesThisMonth: number;
  breakMinutesThisMonth: number;
  overtimeMinutesThisMonth: number;
  remainingLeaveDaysThisYear: number;
  attendancePercent: number;
}

export async function getMyDashboardStats(actor: SessionContext): Promise<MyDashboardStats> {
  const employeeId = requireEmployeeId(actor);
  const timezone = await getCompanyTimezone();
  const now = DateTime.now().setZone(timezone);
  const monthStart = now.startOf("month");
  const year = now.year;

  const [monthAttendance, leaveBalances] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        employeeId,
        attendanceDate: { gte: monthStart.toUTC().toJSDate(), lte: now.toUTC().toJSDate() },
      },
      select: { status: true, workingMinutes: true, breakMinutes: true, overtimeMinutes: true },
    }),
    prisma.leaveBalance.findMany({ where: { employeeId, year }, select: { allocated: true, used: true } }),
  ]);

  const presentDaysThisMonth = monthAttendance.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE" || a.status === "HALF_DAY",
  ).length;
  const workingDaysElapsedThisMonth = monthAttendance.length;
  const workingMinutesThisMonth = monthAttendance.reduce((sum, a) => sum + (a.workingMinutes ?? 0), 0);
  const breakMinutesThisMonth = monthAttendance.reduce((sum, a) => sum + (a.breakMinutes ?? 0), 0);
  const overtimeMinutesThisMonth = monthAttendance.reduce((sum, a) => sum + (a.overtimeMinutes ?? 0), 0);
  const remainingLeaveDaysThisYear = leaveBalances.reduce(
    (sum, b) => sum + (Number(b.allocated) - Number(b.used)),
    0,
  );
  const attendancePercent =
    workingDaysElapsedThisMonth === 0
      ? 0
      : Math.round((presentDaysThisMonth / workingDaysElapsedThisMonth) * 100);

  return {
    presentDaysThisMonth,
    workingDaysElapsedThisMonth,
    workingMinutesThisMonth,
    breakMinutesThisMonth,
    overtimeMinutesThisMonth,
    remainingLeaveDaysThisYear,
    attendancePercent,
  };
}

export interface MyCalendarDay {
  date: string; // yyyy-MM-dd
  status: "PRESENT" | "LATE" | "HALF_DAY" | "ABSENT" | "ON_LEAVE" | "WEEKLY_OFF" | "HOLIDAY" | null;
}

export async function getMyAttendanceCalendar(
  actor: SessionContext,
  year: number,
  month: number, // 1-12
): Promise<MyCalendarDay[]> {
  const employeeId = requireEmployeeId(actor);
  const timezone = await getCompanyTimezone();
  const monthStart = DateTime.fromObject({ year, month, day: 1 }, { zone: timezone }).startOf("month");
  const monthEnd = monthStart.endOf("month");

  const [attendanceRows, settings] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        employeeId,
        attendanceDate: { gte: monthStart.toUTC().toJSDate(), lte: monthEnd.toUTC().toJSDate() },
      },
      select: { attendanceDate: true, status: true },
    }),
    prisma.companySetting.findFirst({ select: { holidayCalendar: true } }),
  ]);

  const holidays = holidaySchema.array().safeParse(settings?.holidayCalendar ?? []);
  const holidayDates = new Set(
    (holidays.success ? holidays.data : []).map((h) => DateTime.fromJSDate(h.date).toFormat("yyyy-MM-dd")),
  );

  const byDate = new Map(
    attendanceRows.map((a) => [
      DateTime.fromJSDate(a.attendanceDate, { zone: "utc" }).toFormat("yyyy-MM-dd"),
      a.status,
    ]),
  );

  const days: MyCalendarDay[] = [];
  for (let d = monthStart; d <= monthEnd; d = d.plus({ days: 1 })) {
    const key = d.toFormat("yyyy-MM-dd");
    days.push({ date: key, status: holidayDates.has(key) ? "HOLIDAY" : (byDate.get(key) ?? null) });
  }
  return days;
}
