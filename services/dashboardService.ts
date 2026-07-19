import "server-only";
import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/permissions";
import { attendanceDateForCheckIn, isNightShift } from "@/lib/attendance/calculations";
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

  const [
    totalEmployees,
    statusCounts,
    checkedInTodayCount,
    checkedOutTodayCount,
    workingNow,
    onBreakNow,
    stillOpenFromBeforeToday,
  ] = await Promise.all([
    prisma.employee.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { attendanceDate: today },
      _count: true,
    }),
    prisma.attendance.count({ where: { attendanceDate: today, checkInAt: { not: null } } }),
    prisma.attendance.count({ where: { attendanceDate: today, checkOutAt: { not: null } } }),
    // Real-time headcount, deliberately not scoped to today's attendanceDate —
    // a night shift (e.g. 9 PM-6 AM) is filed under the day it started, so an
    // employee still clocked in after midnight would otherwise vanish from
    // "today's" numbers the moment the calendar date rolls over.
    prisma.attendance.count({
      where: { checkInAt: { not: null }, checkOutAt: null, breaks: { none: { endAt: null } } },
    }),
    prisma.break.count({ where: { endAt: null } }),
    // Employees mid-shift from a still-open PREVIOUS day's row — without this,
    // "Absent Today" would wrongly count them since they don't have a row
    // dated today yet (their shift is still filed under yesterday).
    prisma.attendance.count({
      where: { attendanceDate: { lt: today }, checkInAt: { not: null }, checkOutAt: null },
    }),
  ]);

  const presentToday = statusCounts.find((s) => s.status === "PRESENT")?._count ?? 0;
  const lateToday = statusCounts.find((s) => s.status === "LATE")?._count ?? 0;
  const accountedForToday = checkedInTodayCount + stillOpenFromBeforeToday;

  return {
    totalEmployees,
    presentToday,
    lateToday,
    onBreakNow,
    workingNow,
    checkedOutToday: checkedOutTodayCount,
    absentToday: Math.max(0, totalEmployees - accountedForToday),
  };
}

export interface ShiftBreakdownRow {
  shiftId: string;
  shiftName: string;
  startMinutesOfDay: number;
  endMinutesOfDay: number;
  isCurrentlyActive: boolean;
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  workingNow: number;
  onBreakNow: number;
  absentToday: number;
}

/** Per-shift version of getDashboardSummary — same live/shift-aware rules,
 * just grouped by shift instead of company-wide, so admins can see which
 * shift is currently running and how busy it is right now. */
export async function getShiftBreakdown(actor: SessionContext): Promise<ShiftBreakdownRow[]> {
  requirePermission(actor, "reports.view.all");

  const timezone = await getCompanyTimezone();
  const today = attendanceDateForCheckIn(new Date(), timezone);
  const nowLocal = DateTime.now().setZone(timezone);
  const nowMinutesOfDay = nowLocal.hour * 60 + nowLocal.minute;

  const [shifts, employeeCounts, checkedInTodayCounts, statusCounts, workingNowCounts, stillOpenCounts, openBreaks] =
    await Promise.all([
      prisma.shift.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.employee.groupBy({
        by: ["shiftId"],
        where: { status: "ACTIVE", deletedAt: null, shiftId: { not: null } },
        _count: true,
      }),
      prisma.attendance.groupBy({
        by: ["shiftId"],
        where: { attendanceDate: today, checkInAt: { not: null } },
        _count: true,
      }),
      prisma.attendance.groupBy({
        by: ["shiftId", "status"],
        where: { attendanceDate: today },
        _count: true,
      }),
      prisma.attendance.groupBy({
        by: ["shiftId"],
        where: { checkInAt: { not: null }, checkOutAt: null, breaks: { none: { endAt: null } } },
        _count: true,
      }),
      prisma.attendance.groupBy({
        by: ["shiftId"],
        where: { attendanceDate: { lt: today }, checkInAt: { not: null }, checkOutAt: null },
        _count: true,
      }),
      prisma.break.findMany({ where: { endAt: null }, select: { attendance: { select: { shiftId: true } } } }),
    ]);

  const employeeCountMap = new Map(employeeCounts.map((e) => [e.shiftId as string, e._count]));
  const checkedInTodayMap = new Map(checkedInTodayCounts.map((c) => [c.shiftId, c._count]));
  const workingNowMap = new Map(workingNowCounts.map((w) => [w.shiftId, w._count]));
  const stillOpenMap = new Map(stillOpenCounts.map((s) => [s.shiftId, s._count]));

  const statusMap = new Map<string, { present: number; late: number }>();
  for (const s of statusCounts) {
    const entry = statusMap.get(s.shiftId) ?? { present: 0, late: 0 };
    if (s.status === "PRESENT") entry.present = s._count;
    if (s.status === "LATE") entry.late = s._count;
    statusMap.set(s.shiftId, entry);
  }

  const onBreakMap = new Map<string, number>();
  for (const b of openBreaks) {
    onBreakMap.set(b.attendance.shiftId, (onBreakMap.get(b.attendance.shiftId) ?? 0) + 1);
  }

  return shifts.map((shift) => {
    const totalEmployees = employeeCountMap.get(shift.id) ?? 0;
    const checkedInToday = checkedInTodayMap.get(shift.id) ?? 0;
    const stillOpenFromBefore = stillOpenMap.get(shift.id) ?? 0;
    const status = statusMap.get(shift.id) ?? { present: 0, late: 0 };
    const isCurrentlyActive = isNightShift(shift)
      ? nowMinutesOfDay >= shift.startMinutesOfDay || nowMinutesOfDay < shift.endMinutesOfDay
      : nowMinutesOfDay >= shift.startMinutesOfDay && nowMinutesOfDay < shift.endMinutesOfDay;

    return {
      shiftId: shift.id,
      shiftName: shift.name,
      startMinutesOfDay: shift.startMinutesOfDay,
      endMinutesOfDay: shift.endMinutesOfDay,
      isCurrentlyActive,
      totalEmployees,
      presentToday: status.present,
      lateToday: status.late,
      workingNow: workingNowMap.get(shift.id) ?? 0,
      onBreakNow: onBreakMap.get(shift.id) ?? 0,
      absentToday: Math.max(0, totalEmployees - (checkedInToday + stillOpenFromBefore)),
    };
  });
}

export interface EmployeeOnBreak {
  employeeId: string;
  employeeName: string;
  departmentName: string | null;
  breakType: string;
  startAt: string;
  completedBreakMinutesToday: number;
  breakAllowanceMinutes: number | null;
}

export async function getEmployeesOnBreak(actor: SessionContext): Promise<EmployeeOnBreak[]> {
  requirePermission(actor, "reports.view.all");

  // Not scoped to today's attendanceDate — a night-shift employee's row is
  // filed under the day their shift started, so this stays accurate for
  // anyone still on break after midnight.
  const rows = await prisma.break.findMany({
    where: { endAt: null },
    select: {
      type: true,
      startAt: true,
      attendance: {
        select: {
          id: true,
          shift: { select: { breakAllowanceMin: true } },
          employee: { select: { id: true, fullName: true, department: { select: { name: true } } } },
        },
      },
    },
    orderBy: { startAt: "asc" },
  });

  const totals = await Promise.all(
    rows.map((row) =>
      prisma.break.aggregate({
        where: { attendanceId: row.attendance.id },
        _sum: { durationMin: true },
      }),
    ),
  );

  return rows.map((row, i) => ({
    employeeId: row.attendance.employee.id,
    employeeName: row.attendance.employee.fullName,
    departmentName: row.attendance.employee.department?.name ?? null,
    breakType: row.type,
    startAt: row.startAt.toISOString(),
    completedBreakMinutesToday: totals[i]._sum.durationMin ?? 0,
    breakAllowanceMinutes: row.attendance.shift?.breakAllowanceMin ?? null,
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

export interface AdminCalendarDay {
  date: string; // yyyy-MM-dd
  presentCount: number;
  lateCount: number;
  halfDayCount: number;
  onLeaveCount: number;
  absentCount: number;
  isHoliday: boolean;
  isFuture: boolean;
}

export async function getAdminAttendanceCalendar(
  actor: SessionContext,
  year: number,
  month: number, // 1-12
): Promise<AdminCalendarDay[]> {
  requirePermission(actor, "reports.view.all");

  const timezone = await getCompanyTimezone();
  const monthStart = DateTime.fromObject({ year, month, day: 1 }, { zone: timezone }).startOf("month");
  const monthEnd = monthStart.endOf("month");
  const todayKey = DateTime.now().setZone(timezone).toFormat("yyyy-MM-dd");

  const [totalEmployees, rows, settings] = await Promise.all([
    prisma.employee.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.attendance.groupBy({
      by: ["attendanceDate", "status"],
      where: { attendanceDate: { gte: monthStart.toUTC().toJSDate(), lte: monthEnd.toUTC().toJSDate() } },
      _count: true,
    }),
    prisma.companySetting.findFirst({ select: { holidayCalendar: true } }),
  ]);

  const holidays = holidaySchema.array().safeParse(settings?.holidayCalendar ?? []);
  const holidayDates = new Set(
    (holidays.success ? holidays.data : []).map((h) => DateTime.fromJSDate(h.date).toFormat("yyyy-MM-dd")),
  );

  const byDate = new Map<string, Partial<Record<string, number>>>();
  for (const row of rows) {
    const key = DateTime.fromJSDate(row.attendanceDate, { zone: "utc" }).toFormat("yyyy-MM-dd");
    const counts = byDate.get(key) ?? {};
    counts[row.status] = row._count;
    byDate.set(key, counts);
  }

  const days: AdminCalendarDay[] = [];
  for (let d = monthStart; d <= monthEnd; d = d.plus({ days: 1 })) {
    const key = d.toFormat("yyyy-MM-dd");
    const counts = byDate.get(key) ?? {};
    const presentCount = counts.PRESENT ?? 0;
    const lateCount = counts.LATE ?? 0;
    const halfDayCount = counts.HALF_DAY ?? 0;
    const onLeaveCount = counts.ON_LEAVE ?? 0;
    const isFuture = key > todayKey;
    const absentCount = isFuture
      ? 0
      : Math.max(0, totalEmployees - (presentCount + lateCount + halfDayCount + onLeaveCount));

    days.push({
      date: key,
      presentCount,
      lateCount,
      halfDayCount,
      onLeaveCount,
      absentCount,
      isHoliday: holidayDates.has(key),
      isFuture,
    });
  }

  return days;
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
  const todayKey = DateTime.now().setZone(timezone).toFormat("yyyy-MM-dd");

  const [employee, attendanceRows, settings] = await Promise.all([
    prisma.employee.findUniqueOrThrow({
      where: { id: employeeId },
      select: {
        joiningDate: true,
        shift: { select: { weeklyOff: true } },
      },
    }),
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

  const weeklyOffDays: number[] = Array.isArray(employee.shift?.weeklyOff)
    ? (employee.shift.weeklyOff as number[])
    : [];

  const joiningDateKey = DateTime.fromJSDate(employee.joiningDate, { zone: "utc" })
    .setZone(timezone)
    .toFormat("yyyy-MM-dd");

  const byDate = new Map(
    attendanceRows.map((a) => [
      DateTime.fromJSDate(a.attendanceDate, { zone: "utc" }).toFormat("yyyy-MM-dd"),
      a.status,
    ]),
  );

  const days: MyCalendarDay[] = [];
  for (let d = monthStart; d <= monthEnd; d = d.plus({ days: 1 })) {
    const key = d.toFormat("yyyy-MM-dd");
    const isHoliday = holidayDates.has(key);
    const dbStatus = byDate.get(key);

    let status: MyCalendarDay["status"] = null;

    if (dbStatus) {
      status = dbStatus as MyCalendarDay["status"];
    } else if (isHoliday) {
      status = "HOLIDAY";
    } else {
      const isFuture = key > todayKey;
      const isBeforeJoining = key < joiningDateKey;

      if (!isFuture && !isBeforeJoining) {
        // Convert Luxon weekday (1-7, Mon=1, Sun=7) to index (0-6, Sun=0, Mon=1, etc.)
        const dayOfWeekIndex = d.weekday % 7;
        const isWeeklyOff = weeklyOffDays.includes(dayOfWeekIndex);

        if (isWeeklyOff) {
          status = "WEEKLY_OFF";
        } else {
          status = "ABSENT";
        }
      }
    }

    days.push({ date: key, status });
  }
  return days;
}

export interface EmployeeWorking {
  employeeId: string;
  employeeName: string;
  departmentName: string | null;
  designationName: string | null;
  shiftName: string | null;
  checkInAt: string;
}

export async function getEmployeesWorking(actor: SessionContext): Promise<EmployeeWorking[]> {
  requirePermission(actor, "reports.view.all");

  const rows = await prisma.attendance.findMany({
    where: {
      checkInAt: { not: null },
      checkOutAt: null,
      breaks: { none: { endAt: null } },
    },
    select: {
      checkInAt: true,
      shift: { select: { name: true } },
      employee: {
        select: {
          id: true,
          fullName: true,
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      },
    },
    orderBy: { checkInAt: "asc" },
  });

  return rows.map((row) => ({
    employeeId: row.employee.id,
    employeeName: row.employee.fullName,
    departmentName: row.employee.department?.name ?? null,
    designationName: row.employee.designation?.name ?? null,
    shiftName: row.shift?.name ?? null,
    checkInAt: row.checkInAt!.toISOString(),
  }));
}
