import "server-only";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, hasPermission } from "@/lib/rbac/permissions";
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

export interface AttendanceReportRow {
  employeeName: string;
  department: string;
  date: string;
  status: string;
  checkInAt: string;
  checkOutAt: string;
  workingMinutes: number | null;
  lateMinutes: number;
  overtimeMinutes: number;
  earlyExitMinutes: number;
}

export async function getAttendanceReport(
  filters: ReportFilters,
  actor: SessionContext,
): Promise<AttendanceReportRow[]> {
  const visibleEmployeeIds = await resolveVisibleEmployeeIds(actor);

  const rows = await prisma.attendance.findMany({
    where: {
      attendanceDate: { gte: filters.startDate, lte: filters.endDate },
      ...employeeFilter(filters, visibleEmployeeIds),
      ...(!visibleEmployeeIds && filters.departmentId
        ? { employee: { departmentId: filters.departmentId } }
        : {}),
    },
    include: { employee: { select: { fullName: true, department: { select: { name: true } } } } },
    orderBy: [{ attendanceDate: "asc" }, { employee: { fullName: "asc" } }],
  });

  return rows.map((row) => ({
    employeeName: row.employee.fullName,
    department: row.employee.department?.name ?? "—",
    date: row.attendanceDate.toISOString().slice(0, 10),
    status: row.status,
    checkInAt: row.checkInAt ? row.checkInAt.toISOString() : "",
    checkOutAt: row.checkOutAt ? row.checkOutAt.toISOString() : "",
    workingMinutes: row.workingMinutes,
    lateMinutes: row.lateMinutes,
    overtimeMinutes: row.overtimeMinutes,
    earlyExitMinutes: row.earlyExitMinutes,
  }));
}

export interface LeaveReportRow {
  employeeName: string;
  department: string;
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
      ...(!visibleEmployeeIds && filters.departmentId
        ? { employee: { departmentId: filters.departmentId } }
        : {}),
    },
    include: { employee: { select: { fullName: true, department: { select: { name: true } } } } },
    orderBy: [{ startDate: "asc" }],
  });

  return rows.map((row) => ({
    employeeName: row.employee.fullName,
    department: row.employee.department?.name ?? "—",
    type: row.type,
    startDate: row.startDate.toISOString().slice(0, 10),
    endDate: row.endDate.toISOString().slice(0, 10),
    days: String(row.days),
    status: row.status,
    reason: row.reason ?? "",
    decisionReason: row.decisionReason ?? "",
  }));
}
