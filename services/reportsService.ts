import "server-only";
import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, hasPermission } from "@/lib/rbac/permissions";
import { shiftEndInstant, shiftStartInstant } from "@/lib/attendance/calculations";
import { buildTimeline, type TimelineEvent } from "@/lib/reports/buildTimeline";
import { parseUserAgent } from "@/lib/reports/parseUserAgent";
import type { SessionContext } from "@/types/session";
import type { ReportFilters } from "@/lib/validation/report";

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

async function getCompanyTimezone(): Promise<string> {
  const settings = await prisma.companySetting.findFirst({ select: { timezone: true } });
  return settings?.timezone ?? "Asia/Kolkata";
}

/** 12-hour local clock time for report exports (e.g. "11:47 PM") — raw ISO
 * strings were previously exported as-is, overflowing fixed-width PDF cells. */
function formatClockLabel(date: Date | null, timezone: string): string {
  if (!date) return "";
  return DateTime.fromJSDate(date, { zone: "utc" }).setZone(timezone).toFormat("h:mm a");
}

export interface AttendanceReportRow {
  attendanceId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  shiftName: string;
  date: string;
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
  const [visibleEmployeeIds, timezone] = await Promise.all([
    resolveVisibleEmployeeIds(actor),
    getCompanyTimezone(),
  ]);

  const rows = await prisma.attendance.findMany({
    where: {
      attendanceDate: { gte: filters.startDate, lte: filters.endDate },
      ...employeeFilter(filters, visibleEmployeeIds),
      ...(filters.status
        ? {
            status: filters.status as
              | "PRESENT"
              | "LATE"
              | "HALF_DAY"
              | "ABSENT"
              | "ON_LEAVE"
              | "HOLIDAY"
              | "WEEKLY_OFF",
          }
        : {}),
      ...(!visibleEmployeeIds && filters.departmentId
        ? { employee: { departmentId: filters.departmentId } }
        : {}),
      ...(!visibleEmployeeIds && filters.designationId
        ? { employee: { designationId: filters.designationId } }
        : {}),
      ...(!visibleEmployeeIds && filters.shiftId ? { shiftId: filters.shiftId } : {}),
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
    orderBy: [{ attendanceDate: "asc" }, { employee: { fullName: "asc" } }],
  });

  return rows.map((row) => ({
    attendanceId: row.id,
    employeeCode: row.employee.user.employeeCode,
    employeeName: row.employee.fullName,
    department: row.employee.department?.name ?? "—",
    designation: row.employee.designation?.name ?? "—",
    shiftName: row.shift.name,
    date: row.attendanceDate.toISOString().slice(0, 10),
    status: row.status,
    checkInAt: formatClockLabel(row.checkInAt, timezone),
    checkOutAt: formatClockLabel(row.checkOutAt, timezone),
    workingMinutes: row.workingMinutes,
    breakMinutes: row.breakMinutes,
    lateMinutes: row.lateMinutes,
    overtimeMinutes: row.overtimeMinutes,
    earlyExitMinutes: row.earlyExitMinutes,
  }));
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
