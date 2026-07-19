import "server-only";
import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, hasPermission } from "@/lib/rbac/permissions";
import { shiftEndInstant, shiftStartInstant } from "@/lib/attendance/calculations";
import { buildTimeline, type TimelineEvent } from "@/lib/reports/buildTimeline";
import { parseUserAgent } from "@/lib/reports/parseUserAgent";
import type { SessionContext } from "@/types/session";
import type { ReportFilters } from "@/lib/validation/report";
import { holidaySchema } from "@/lib/validation/companySettings";

async function resolveVisibleEmployeeIds(actor: SessionContext): Promise<string[] | undefined> {
  if (hasPermission(actor, "reports.view.all")) return undefined;

  if (hasPermission(actor, "reports.view.self")) {
    return actor.employeeId ? [actor.employeeId] : [];
  }

  throw new ForbiddenError("reports.view.self");
}

function employeeFilter(
  filters: ReportFilters,
  visibleEmployeeIds: string[] | undefined,
): { employeeId?: string | { in: string[] } } {
  if (visibleEmployeeIds) return { employeeId: { in: visibleEmployeeIds } };
  if (filters.employeeId) return { employeeId: filters.employeeId };
  return {};
}

export async function getCompanyTimezone(): Promise<string> {
  const settings = await prisma.companySetting.findFirst({ select: { timezone: true } });
  return settings?.timezone ?? "Asia/Kolkata";
}

/** 12-hour local clock time for report exports (e.g. "11:47 PM") — the live
 * Reports page formats checkInAt/checkOutAt itself client-side, so this is
 * only used by the CSV/Excel/PDF export routes, which have no such step. */
export function formatClockLabel(iso: string, timezone: string): string {
  if (!iso) return "";
  return DateTime.fromISO(iso, { zone: "utc" }).setZone(timezone).toFormat("h:mm a");
}

export interface AttendanceReportRow {
  attendanceId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  shiftName: string;
  /** Attendance date (= shift-start date). For night shifts this is the date
   * the shift started, which may differ from the calendar date of the logout. */
  date: string;
  /** IST date of the actual logout — differs from `date` for night shifts that
   * cross midnight (e.g. login July 15 PM → logout July 16 AM). */
  logoutDate: string;
  status: string;
  checkInAt: string;
  checkOutAt: string;
  workingMinutes: number | null;
  breakMinutes: number | null;
  lateMinutes: number;
  overtimeMinutes: number;
  earlyExitMinutes: number;
}

export async function getAttendanceReport(
  filters: ReportFilters,
  actor: SessionContext,
): Promise<AttendanceReportRow[]> {
  const visibleEmployeeIds = await resolveVisibleEmployeeIds(actor);

  // 1. Fetch all matching employees
  const employees = await prisma.employee.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      ...(visibleEmployeeIds
        ? { id: { in: visibleEmployeeIds } }
        : filters.employeeId
          ? { id: filters.employeeId }
          : {}),
      ...(!visibleEmployeeIds && filters.departmentId
        ? { departmentId: filters.departmentId }
        : {}),
      ...(!visibleEmployeeIds && filters.designationId
        ? { designationId: filters.designationId }
        : {}),
      ...(!visibleEmployeeIds && filters.shiftId ? { shiftId: filters.shiftId } : {}),
    },
    include: {
      shift: true,
      user: { select: { employeeCode: true } },
      department: { select: { name: true } },
      designation: { select: { name: true } },
    },
  });

  const employeeIds = employees.map((e) => e.id);

  // 2. Fetch existing attendance rows in the date range for these employees
  const dbRows = await prisma.attendance.findMany({
    where: {
      employeeId: { in: employeeIds },
      attendanceDate: { gte: filters.startDate, lte: filters.endDate },
    },
    include: {
      shift: { select: { name: true } },
      employee: {
        select: {
          fullName: true,
          user: { select: { employeeCode: true } },
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      },
    },
  });

  const companySettings = await prisma.companySetting.findFirst({ select: { holidayCalendar: true } });
  const holidays = holidaySchema.array().safeParse(companySettings?.holidayCalendar ?? []);
  const timezone = await getCompanyTimezone();
  const holidayDates = new Set(
    (holidays.success ? holidays.data : []).map((h) => DateTime.fromJSDate(h.date).toFormat("yyyy-MM-dd")),
  );

  // Map of employeeId_dateKey -> AttendanceRow
  const existingMap = new Map<string, typeof dbRows[number]>();
  for (const row of dbRows) {
    const dateKey = DateTime.fromJSDate(row.attendanceDate, { zone: "utc" }).toFormat("yyyy-MM-dd");
    existingMap.set(`${row.employeeId}_${dateKey}`, row);
  }

  // 3. Generate rows for each date in selected range
  const startDt = DateTime.fromJSDate(filters.startDate, { zone: timezone }).startOf("day");
  const endDt = DateTime.fromJSDate(filters.endDate, { zone: timezone }).endOf("day");
  const todayKey = DateTime.now().setZone(timezone).toFormat("yyyy-MM-dd");

  // Pre-calculate joining dates and weekly off days outside the nested loops for massive performance speedup
  const empJoiningDates = new Map<string, string>();
  const empWeeklyOffs = new Map<string, number[]>();

  for (const emp of employees) {
    const key = DateTime.fromJSDate(emp.joiningDate, { zone: "utc" })
      .setZone(timezone)
      .toFormat("yyyy-MM-dd");
    empJoiningDates.set(emp.id, key);

    const weeklyOffDays: number[] = Array.isArray(emp.shift?.weeklyOff)
      ? (emp.shift.weeklyOff as number[])
      : [];
    empWeeklyOffs.set(emp.id, weeklyOffDays);
  }

  const reportRows: AttendanceReportRow[] = [];

  for (let d = startDt; d <= endDt; d = d.plus({ days: 1 })) {
    const key = d.toFormat("yyyy-MM-dd");
    const isHoliday = holidayDates.has(key);
    const dayOfWeekIndex = d.weekday % 7;

    for (const emp of employees) {
      const dbRow = existingMap.get(`${emp.id}_${key}`);

      // Check joining date constraint
      const joiningDateKey = empJoiningDates.get(emp.id) || "";
      if (key < joiningDateKey) continue;

      if (dbRow) {
        // Map existing record
        const checkOutIso = dbRow.checkOutAt ? dbRow.checkOutAt.toISOString() : "";
        const logoutDate = checkOutIso
          ? DateTime.fromISO(checkOutIso, { zone: "utc" }).setZone(timezone).toFormat("yyyy-MM-dd")
          : "";

        reportRows.push({
          attendanceId: dbRow.id,
          employeeId: emp.id,
          employeeCode: emp.user?.employeeCode ?? "—",
          employeeName: emp.fullName,
          department: emp.department?.name ?? "—",
          designation: emp.designation?.name ?? "—",
          shiftName: dbRow.shift?.name ?? "—",
          date: key,
          logoutDate,
          status: dbRow.status,
          checkInAt: dbRow.checkInAt ? dbRow.checkInAt.toISOString() : "",
          checkOutAt: checkOutIso,
          workingMinutes: dbRow.workingMinutes,
          breakMinutes: dbRow.breakMinutes,
          lateMinutes: dbRow.lateMinutes,
          overtimeMinutes: dbRow.overtimeMinutes,
          earlyExitMinutes: dbRow.earlyExitMinutes,
        });
      } else {
        // Generate absent/weekly_off/holiday row
        const weeklyOffDays = empWeeklyOffs.get(emp.id) || [];
        const isWeeklyOff = weeklyOffDays.includes(dayOfWeekIndex);

        let status = "ABSENT";
        if (isHoliday) {
          status = "HOLIDAY";
        } else if (isWeeklyOff) {
          status = "WEEKLY_OFF";
        } else if (key > todayKey) {
          // Future dates are not 'ABSENT' yet; display as empty pending
          status = "—";
        }

        reportRows.push({
          attendanceId: `dynamic_${emp.id}_${key}`,
          employeeId: emp.id,
          employeeCode: emp.user?.employeeCode ?? "—",
          employeeName: emp.fullName,
          department: emp.department?.name ?? "—",
          designation: emp.designation?.name ?? "—",
          shiftName: emp.shift?.name ?? "—",
          date: key,
          logoutDate: "",
          status,
          checkInAt: "",
          checkOutAt: "",
          workingMinutes: null,
          breakMinutes: null,
          lateMinutes: 0,
          overtimeMinutes: 0,
          earlyExitMinutes: 0,
        });
      }
    }
  }

  // 4. Apply status filter if provided
  let filteredRows = reportRows;
  if (filters.status) {
    filteredRows = reportRows.filter((r) => r.status === filters.status);
  }

  // 5. Sort by date ascending, then employeeName ascending
  return filteredRows.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.employeeName.localeCompare(b.employeeName);
  });
}

export interface EmployeeAttendanceDetail {
  attendanceId: string;
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
    email: string;
    phone: string | null;
    department: string;
    designation: string;
    shiftName: string;
    joiningDate: string;
    status: string;
  };
  attendance: {
    date: string;
    shiftStart: string;
    shiftEnd: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    workingMinutes: number | null;
    breakMinutes: number | null;
    lateMinutes: number;
    earlyExitMinutes: number;
    overtimeMinutes: number;
    status: string;
  };
  breaks: Array<{
    type: string;
    startAt: string;
    endAt: string | null;
    durationMin: number | null;
  }>;
  timeline: TimelineEvent[];
  summary: {
    expectedMinutes: number;
    actualSpanMinutes: number | null;
    breakMinutes: number;
    netWorkingMinutes: number | null;
    lateMinutes: number;
    earlyExitMinutes: number;
    overtimeMinutes: number;
    attendancePercentThisMonth: number;
  };
  deviceInfo: {
    loginIp: string | null;
    logoutIp: string | null;
    loginBrowser: string | null;
    loginOs: string | null;
  };
  notes: {
    adminNotes: string | null;
    attendanceRemarks: string | null;
  };
}

export async function getEmployeeAttendanceDetail(
  attendanceId: string,
  actor: SessionContext,
): Promise<EmployeeAttendanceDetail> {
  const visibleEmployeeIds = await resolveVisibleEmployeeIds(actor);

  const row = await prisma.attendance.findUniqueOrThrow({
    where: { id: attendanceId },
    include: {
      shift: true,
      breaks: { orderBy: { startAt: "asc" } },
      employee: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          joiningDate: true,
          status: true,
          user: { select: { employeeCode: true, email: true } },
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      },
    },
  });

  if (visibleEmployeeIds && !visibleEmployeeIds.includes(row.employeeId)) {
    throw new ForbiddenError("reports.view.self");
  }

  const timezone = await getCompanyTimezone();
  const shiftTiming = {
    startMinutesOfDay: row.shift.startMinutesOfDay,
    endMinutesOfDay: row.shift.endMinutesOfDay,
    gracePeriodMin: row.shift.gracePeriodMin,
    halfDayThresholdMin: row.shift.halfDayThresholdMin,
    overtimeRule: row.shift.overtimeRule as { thresholdMin: number; roundingMin: number },
  };
  const shiftStart = shiftStartInstant(row.attendanceDate, shiftTiming, timezone);
  const shiftEnd = shiftEndInstant(row.attendanceDate, shiftTiming, timezone);
  const expectedMinutes = Math.round(shiftEnd.diff(shiftStart, "minutes").minutes);

  const actualSpanMinutes =
    row.checkInAt && row.checkOutAt
      ? Math.round(
          DateTime.fromJSDate(row.checkOutAt).diff(DateTime.fromJSDate(row.checkInAt), "minutes").minutes,
        )
      : null;

  const monthStart = DateTime.fromJSDate(row.attendanceDate, { zone: "utc" })
    .setZone(timezone)
    .startOf("month");
  const monthEnd = monthStart.endOf("month");
  const monthAttendance = await prisma.attendance.findMany({
    where: {
      employeeId: row.employeeId,
      attendanceDate: { gte: monthStart.toUTC().toJSDate(), lte: monthEnd.toUTC().toJSDate() },
    },
    select: { status: true },
  });
  const presentDays = monthAttendance.filter((a) =>
    ["PRESENT", "LATE", "HALF_DAY"].includes(a.status),
  ).length;
  const attendancePercentThisMonth =
    monthAttendance.length === 0 ? 0 : Math.round((presentDays / monthAttendance.length) * 100);

  const loginUa = parseUserAgent(row.checkInUserAgent);

  return {
    attendanceId: row.id,
    employee: {
      id: row.employee.id,
      employeeCode: row.employee.user.employeeCode,
      fullName: row.employee.fullName,
      email: row.employee.user.email,
      phone: row.employee.phone,
      department: row.employee.department?.name ?? "—",
      designation: row.employee.designation?.name ?? "—",
      shiftName: row.shift.name,
      joiningDate: row.employee.joiningDate.toISOString().slice(0, 10),
      status: row.employee.status,
    },
    attendance: {
      date: row.attendanceDate.toISOString().slice(0, 10),
      shiftStart: shiftStart.toISO() ?? "",
      shiftEnd: shiftEnd.toISO() ?? "",
      checkInAt: row.checkInAt ? row.checkInAt.toISOString() : null,
      checkOutAt: row.checkOutAt ? row.checkOutAt.toISOString() : null,
      workingMinutes: row.workingMinutes,
      breakMinutes: row.breakMinutes,
      lateMinutes: row.lateMinutes,
      earlyExitMinutes: row.earlyExitMinutes,
      overtimeMinutes: row.overtimeMinutes,
      status: row.status,
    },
    breaks: row.breaks.map((b) => ({
      type: b.type,
      startAt: b.startAt.toISOString(),
      endAt: b.endAt ? b.endAt.toISOString() : null,
      durationMin: b.durationMin,
    })),
    timeline: buildTimeline({ checkInAt: row.checkInAt, checkOutAt: row.checkOutAt, breaks: row.breaks }),
    summary: {
      expectedMinutes,
      actualSpanMinutes,
      breakMinutes: row.breakMinutes ?? 0,
      netWorkingMinutes: row.workingMinutes,
      lateMinutes: row.lateMinutes,
      earlyExitMinutes: row.earlyExitMinutes,
      overtimeMinutes: row.overtimeMinutes,
      attendancePercentThisMonth,
    },
    deviceInfo: {
      loginIp: row.checkInIp,
      logoutIp: row.checkOutIp,
      loginBrowser: loginUa.browser,
      loginOs: loginUa.os,
    },
    notes: {
      adminNotes: row.adminNotes,
      attendanceRemarks: row.correctionReason,
    },
  };
}

export interface LeaveReportRow {
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  type: string;
  startDate: string;
  endDate: string;
  days: string;
  status: string;
  reason: string;
  decisionReason: string;
}

export async function getLeaveReport(
  filters: ReportFilters,
  actor: SessionContext,
): Promise<LeaveReportRow[]> {
  const visibleEmployeeIds = await resolveVisibleEmployeeIds(actor);

  const rows = await prisma.leave.findMany({
    where: {
      startDate: { lte: filters.endDate },
      endDate: { gte: filters.startDate },
      ...employeeFilter(filters, visibleEmployeeIds),
      ...(filters.status
        ? { status: filters.status as "APPLIED" | "APPROVED" | "REJECTED" | "CANCELLED" }
        : {}),
      ...(filters.leaveTypeId ? { typeId: filters.leaveTypeId } : {}),
      ...(!visibleEmployeeIds && filters.departmentId
        ? { employee: { departmentId: filters.departmentId } }
        : {}),
      ...(!visibleEmployeeIds && filters.designationId
        ? { employee: { designationId: filters.designationId } }
        : {}),
    },
    include: {
      type: { select: { name: true } },
      employee: {
        select: {
          fullName: true,
          user: { select: { employeeCode: true } },
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      },
    },
    orderBy: [{ startDate: "asc" }],
  });

  return rows.map((row) => ({
    employeeCode: row.employee.user.employeeCode,
    employeeName: row.employee.fullName,
    department: row.employee.department?.name ?? "—",
    designation: row.employee.designation?.name ?? "—",
    type: row.type.name,
    startDate: row.startDate.toISOString().slice(0, 10),
    endDate: row.endDate.toISOString().slice(0, 10),
    days: String(row.days),
    status: row.status,
    reason: row.reason ?? "",
    decisionReason: row.decisionReason ?? "",
  }));
}
