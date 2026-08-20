import "server-only";
import path from "path";
import { unlink } from "fs/promises";
import { DateTime } from "luxon";
import type { Prisma } from "@/lib/prisma-client/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/permissions";
import { employeeSelect } from "@/lib/rbac/fieldVisibility";
import { recordAudit } from "@/services/auditService";
import { revokeAllSessionsForUser } from "@/services/sessionService";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { getDashboardSummary } from "@/services/dashboardService";
import { attendanceDateForCheckIn } from "@/lib/attendance/calculations";
import type { SessionContext } from "@/types/session";
import type {
  CreateEmployeeInput,
  EmployeeSearchInput,
  UpdateEmployeeInput,
  UpdateMyProfileInput,
} from "@/lib/validation/employee";

const EMPLOYEE_PHOTO_DIR = path.join(process.cwd(), "storage", "employee-photos");

const PROBATION_DAYS = 90;

async function getCompanyTimezone(): Promise<string> {
  const settings = await prisma.companySetting.findFirst({ select: { timezone: true } });
  return settings?.timezone ?? "Asia/Kolkata";
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

export async function createEmployee(
  input: CreateEmployeeInput,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "employee.manage");

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const employee = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        employeeCode: input.employeeCode,
        email: input.email,
        passwordHash,
        roleId: input.roleId,
        mustChangePassword: true,
      },
    });

    return tx.employee.create({
      data: {
        userId: user.id,
        fullName: input.fullName,
        phone: input.phone,
        address: input.address,
        departmentId: input.departmentId,
        designationId: input.designationId,
        shiftId: input.shiftId,
        managerId: input.managerId,
        joiningDate: input.joiningDate,
        salary: input.salary,
        salaryType: input.salaryType,
        allowances: input.allowances,
        deductions: input.deductions,
        emergencyContact: input.emergencyContact,
        panNumber: input.panNumber,
        aadhaarNumber: input.aadhaarNumber,
        bankAccount: input.bankAccount,
        bankName: input.bankName,
        profileImageUrl: input.photoPath,
      },
      select: employeeSelect(actor),
    });
  });

  await recordAudit({
    actorUserId: actor.userId,
    action: "employee.created",
    targetEntity: "employee",
    targetId: String(employee.id),
    ip: meta.ip,
    userAgent: meta.userAgent,
    after: employee as Prisma.InputJsonValue,
  });

  return { employee, tempPassword };
}

export async function updateEmployee(
  employeeId: string,
  input: UpdateEmployeeInput,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "employee.manage");

  const existing = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { ...employeeSelect(actor), deletedAt: true },
  });
  if (!existing || existing.deletedAt) throw new NotFoundError("Employee not found");

  const updated = await prisma.$transaction(async (tx) => {
    if (input.roleId) {
      await tx.user.update({ where: { id: existing.userId }, data: { roleId: input.roleId } });
    }
    return tx.employee.update({
      where: { id: employeeId },
      data: {
        fullName: input.fullName,
        phone: input.phone,
        address: input.address,
        departmentId: input.departmentId,
        designationId: input.designationId,
        shiftId: input.shiftId,
        managerId: input.managerId,
        joiningDate: input.joiningDate,
        dateOfBirth: input.dateOfBirth,
        salary: input.salary,
        salaryType: input.salaryType,
        allowances: input.allowances,
        deductions: input.deductions,
        emergencyContact: input.emergencyContact,
        panNumber: input.panNumber,
        aadhaarNumber: input.aadhaarNumber,
        bankAccount: input.bankAccount,
        bankName: input.bankName,
        profileImageUrl: input.photoPath,
      },
      select: employeeSelect(actor),
    });
  });

  await recordAudit({
    actorUserId: actor.userId,
    action: "employee.updated",
    targetEntity: "employee",
    targetId: employeeId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    before: existing as Prisma.InputJsonValue,
    after: updated as Prisma.InputJsonValue,
  });

  return updated;
}

/** Self-service: the logged-in employee's own profile. */
export async function getMyProfile(actor: SessionContext) {
  if (!actor.employeeId) throw new NotFoundError("No employee profile linked to this account");

  const employee = await prisma.employee.findFirst({
    where: { id: actor.employeeId, deletedAt: null },
    select: employeeSelect(actor),
  });
  if (!employee) throw new NotFoundError("Employee not found");
  return employee;
}

/**
 * Self-service: an employee may update their own contact details and photo —
 * everything else (department, designation, shift, salary, status...) stays
 * admin-only via `updateEmployee`.
 */
export async function updateMyProfile(
  input: UpdateMyProfileInput,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  if (!actor.employeeId) throw new NotFoundError("No employee profile linked to this account");

  const existing = await prisma.employee.findFirst({
    where: { id: actor.employeeId, deletedAt: null },
    select: { profileImageUrl: true },
  });
  if (!existing) throw new NotFoundError("Employee not found");

  const updated = await prisma.employee.update({
    where: { id: actor.employeeId },
    data: {
      phone: input.phone,
      address: input.address,
      emergencyContact: input.emergencyContact,
      profileImageUrl: input.photoPath,
    },
    select: employeeSelect(actor),
  });

  // Replacing the photo — best-effort delete of the old file so uploads
  // don't accumulate on disk. Never blocks the profile update itself.
  if (input.photoPath && existing.profileImageUrl && existing.profileImageUrl !== input.photoPath) {
    unlink(path.join(EMPLOYEE_PHOTO_DIR, existing.profileImageUrl)).catch(() => {});
  }

  await recordAudit({
    actorUserId: actor.userId,
    action: "employee.self_updated_profile",
    targetEntity: "employee",
    targetId: actor.employeeId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: {
      phoneChanged: input.phone !== undefined,
      addressChanged: input.address !== undefined,
      emergencyContactChanged: input.emergencyContact !== undefined,
      photoChanged: !!input.photoPath,
    },
  });

  return updated;
}

/**
 * Moves an employee into a non-active status. Backs both `deactivateEmployee`
 * (→ INACTIVE) and the newer "Mark as Resigned" action (→ RESIGNED) so both
 * share one audited, session-revoking implementation.
 */
export async function setEmployeeStatus(
  employeeId: string,
  status: "INACTIVE" | "RESIGNED",
  actor: SessionContext,
  meta: RequestMeta = {},
): Promise<void> {
  requirePermission(actor, "employee.manage");

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, userId: true, deletedAt: true, status: true },
  });
  if (!employee || employee.deletedAt) throw new NotFoundError("Employee not found");

  await prisma.$transaction([
    prisma.employee.update({
      where: { id: employeeId },
      data: { status, resignedAt: status === "RESIGNED" ? new Date() : undefined },
    }),
    prisma.user.update({ where: { id: employee.userId }, data: { status: "INACTIVE" } }),
  ]);

  await revokeAllSessionsForUser(employee.userId);

  await recordAudit({
    actorUserId: actor.userId,
    action: status === "RESIGNED" ? "employee.resigned" : "employee.deactivated",
    targetEntity: "employee",
    targetId: employeeId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    before: { status: employee.status },
    after: { status },
  });
}

export async function deactivateEmployee(
  employeeId: string,
  actor: SessionContext,
  meta: RequestMeta = {},
): Promise<void> {
  return setEmployeeStatus(employeeId, "INACTIVE", actor, meta);
}

export async function activateEmployee(
  employeeId: string,
  actor: SessionContext,
  meta: RequestMeta = {},
): Promise<void> {
  requirePermission(actor, "employee.manage");

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, userId: true, deletedAt: true, status: true },
  });
  if (!employee || employee.deletedAt) throw new NotFoundError("Employee not found");

  await prisma.$transaction([
    prisma.employee.update({ where: { id: employeeId }, data: { status: "ACTIVE" } }),
    prisma.user.update({ where: { id: employee.userId }, data: { status: "ACTIVE" } }),
  ]);

  await recordAudit({
    actorUserId: actor.userId,
    action: "employee.activated",
    targetEntity: "employee",
    targetId: employeeId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    before: { status: employee.status },
    after: { status: "ACTIVE" },
  });
}

export async function deleteEmployee(
  employeeId: string,
  actor: SessionContext,
  meta: RequestMeta = {},
): Promise<void> {
  requirePermission(actor, "employee.delete");

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      userId: true,
      deletedAt: true,
      user: { select: { role: { select: { name: true } } } },
    },
  });
  if (!employee || employee.deletedAt) throw new NotFoundError("Employee not found");

  // 🔒 Admin accounts can never be deleted — they must be deactivated instead.
  if (employee.user.role.name === "ADMIN") {
    throw new Error("Admin accounts cannot be deleted. Deactivate the account instead.");
  }

  await prisma.$transaction([
    prisma.employee.update({
      where: { id: employeeId },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    }),
    prisma.user.update({ where: { id: employee.userId }, data: { status: "INACTIVE" } }),
  ]);

  await revokeAllSessionsForUser(employee.userId);

  await recordAudit({
    actorUserId: actor.userId,
    action: "employee.deleted",
    targetEntity: "employee",
    targetId: employeeId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}

const SORT_FIELD_MAP: Record<
  EmployeeSearchInput["sortBy"],
  Record<"asc" | "desc", Prisma.EmployeeOrderByWithRelationInput>
> = {
  fullName: { asc: { fullName: "asc" }, desc: { fullName: "desc" } },
  joiningDate: { asc: { joiningDate: "asc" }, desc: { joiningDate: "desc" } },
  employeeCode: { asc: { user: { employeeCode: "asc" } }, desc: { user: { employeeCode: "desc" } } },
  department: { asc: { department: { name: "asc" } }, desc: { department: { name: "desc" } } },
};

export async function searchEmployees(input: EmployeeSearchInput, actor: SessionContext) {
  requirePermission(actor, "employee.manage");

  const timezone = await getCompanyTimezone();
  const today = attendanceDateForCheckIn(new Date(), timezone);

  const where: Prisma.EmployeeWhereInput = {
    deletedAt: null,
    ...(input.departmentId ? { departmentId: input.departmentId } : {}),
    ...(input.designationId ? { designationId: input.designationId } : {}),
    ...(input.shiftId ? { shiftId: input.shiftId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.joiningDateFrom || input.joiningDateTo
      ? {
          joiningDate: {
            ...(input.joiningDateFrom ? { gte: input.joiningDateFrom } : {}),
            ...(input.joiningDateTo ? { lte: input.joiningDateTo } : {}),
          },
        }
      : {}),
    ...(input.attendanceStatus
      ? { attendance: { some: { attendanceDate: today, status: input.attendanceStatus } } }
      : {}),
    ...(input.query
      ? {
          OR: [
            { fullName: { contains: input.query, mode: "insensitive" } },
            { phone: { contains: input.query, mode: "insensitive" } },
            { user: { employeeCode: { contains: input.query, mode: "insensitive" } } },
            { user: { email: { contains: input.query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const orderBy = SORT_FIELD_MAP[input.sortBy][input.sortDir];

  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      select: employeeSelect(actor),
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy,
    }),
    prisma.employee.count({ where }),
  ]);

  const itemIds = items.map((e) => e.id);
  const onLeaveToday = itemIds.length
    ? await prisma.leave.findMany({
        where: {
          employeeId: { in: itemIds },
          status: "APPROVED",
          startDate: { lte: today },
          endDate: { gte: today },
        },
        select: { employeeId: true },
      })
    : [];
  const onLeaveSet = new Set(onLeaveToday.map((l) => l.employeeId));
  const probationCutoff = DateTime.now().setZone(timezone).minus({ days: PROBATION_DAYS }).toJSDate();

  const enrichedItems = items.map((e) => ({
    ...e,
    isOnLeaveToday: onLeaveSet.has(e.id),
    isOnProbation: e.status === "ACTIVE" && e.joiningDate > probationCutoff,
  }));

  return { items: enrichedItems, total, page: input.page, pageSize: input.pageSize };
}

export async function getEmployeeById(employeeId: string, actor: SessionContext) {
  requirePermission(actor, "employee.manage");

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, deletedAt: null },
    select: employeeSelect(actor),
  });
  if (!employee) throw new NotFoundError("Employee not found");
  return employee;
}

export interface EmployeeManagementStats {
  totalEmployees: number;
  activeCount: number;
  inactiveCount: number;
  onLeaveToday: number;
  presentToday: number;
  absentToday: number;
  newThisMonth: number;
}

export async function getEmployeeManagementStats(actor: SessionContext): Promise<EmployeeManagementStats> {
  requirePermission(actor, "employee.manage");

  const timezone = await getCompanyTimezone();
  const today = attendanceDateForCheckIn(new Date(), timezone);
  const monthStart = DateTime.now().setZone(timezone).startOf("month").toJSDate();

  const [dashboardSummary, activeCount, inactiveCount, onLeaveRows, newThisMonth] = await Promise.all([
    getDashboardSummary(actor),
    prisma.employee.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.employee.count({ where: { deletedAt: null, status: { in: ["INACTIVE", "RESIGNED"] } } }),
    prisma.leave.findMany({
      where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } },
      select: { employeeId: true },
      distinct: ["employeeId"],
    }),
    prisma.employee.count({ where: { deletedAt: null, joiningDate: { gte: monthStart } } }),
  ]);

  return {
    totalEmployees: dashboardSummary.totalEmployees,
    activeCount,
    inactiveCount,
    onLeaveToday: onLeaveRows.length,
    presentToday: dashboardSummary.presentToday,
    absentToday: dashboardSummary.absentToday,
    newThisMonth,
  };
}

export interface EmployeeProfileTimelineEvent {
  action: string;
  createdAt: string;
  metadata: unknown;
}

export async function getEmployeeProfile(employeeId: string, actor: SessionContext) {
  requirePermission(actor, "employee.manage");

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, deletedAt: null },
    select: employeeSelect(actor),
  });
  if (!employee) throw new NotFoundError("Employee not found");

  const timezone = await getCompanyTimezone();
  const now = DateTime.now().setZone(timezone);
  const monthStart = now.startOf("month");
  const year = now.year;

  const [monthAttendance, leaveBalances, recentAttendance, documents, employeeAudit, userAudit] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId, attendanceDate: { gte: monthStart.toUTC().toJSDate(), lte: now.toUTC().toJSDate() } },
      select: { status: true, workingMinutes: true, breakMinutes: true, overtimeMinutes: true, lateMinutes: true },
    }),
    prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { type: true },
      orderBy: { type: { name: "asc" } },
    }),
    prisma.attendance.findMany({
      where: { employeeId },
      include: { shift: { select: { name: true } } },
      orderBy: { attendanceDate: "desc" },
      take: 30,
    }),
    prisma.employeeDocument.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" } }),
    prisma.auditLog.findMany({
      where: { targetEntity: "employee", targetId: employeeId },
      select: { action: true, createdAt: true, metadata: true },
    }),
    prisma.auditLog.findMany({
      where: { targetEntity: "user", targetId: employee.userId },
      select: { action: true, createdAt: true, metadata: true },
    }),
  ]);

  const presentDays = monthAttendance.filter((a) => ["PRESENT", "LATE", "HALF_DAY"].includes(a.status)).length;
  const absentDays = monthAttendance.filter((a) => a.status === "ABSENT").length;
  const lateDays = monthAttendance.filter((a) => a.status === "LATE").length;
  const leaveDays = monthAttendance.filter((a) => a.status === "ON_LEAVE").length;
  const workingDaysElapsed = monthAttendance.length;
  const workingMinutes = monthAttendance.reduce((sum, a) => sum + (a.workingMinutes ?? 0), 0);
  const overtimeMinutes = monthAttendance.reduce((sum, a) => sum + (a.overtimeMinutes ?? 0), 0);
  const attendancePercent = workingDaysElapsed === 0 ? 0 : Math.round((presentDays / workingDaysElapsed) * 100);

  const timeline: EmployeeProfileTimelineEvent[] = [...employeeAudit, ...userAudit]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((row) => ({ action: row.action, createdAt: row.createdAt.toISOString(), metadata: row.metadata }));

  return {
    employee,
    attendanceSummary: { presentDays, absentDays, lateDays, leaveDays, attendancePercent, workingMinutes, overtimeMinutes },
    leaveBalances,
    recentAttendance,
    documents,
    timeline,
  };
}

async function requireExistingEmployeeIds(employeeIds: string[]): Promise<string[]> {
  const rows = await prisma.employee.findMany({
    where: { id: { in: employeeIds }, deletedAt: null },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export interface BulkResult {
  succeeded: number;
  failed: number;
  errors: string[];
}

export async function bulkActivateEmployees(
  employeeIds: string[],
  actor: SessionContext,
  meta: RequestMeta = {},
): Promise<BulkResult> {
  requirePermission(actor, "employee.manage");
  const ids = await requireExistingEmployeeIds(employeeIds);
  const result: BulkResult = { succeeded: 0, failed: 0, errors: [] };
  for (const id of ids) {
    try {
      await activateEmployee(id, actor, meta);
      result.succeeded++;
    } catch (err) {
      result.failed++;
      result.errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  return result;
}

export async function bulkSetStatus(
  employeeIds: string[],
  status: "INACTIVE" | "RESIGNED",
  actor: SessionContext,
  meta: RequestMeta = {},
): Promise<BulkResult> {
  requirePermission(actor, "employee.manage");
  const ids = await requireExistingEmployeeIds(employeeIds);
  const result: BulkResult = { succeeded: 0, failed: 0, errors: [] };
  for (const id of ids) {
    try {
      await setEmployeeStatus(id, status, actor, meta);
      result.succeeded++;
    } catch (err) {
      result.failed++;
      result.errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  return result;
}

export async function bulkDeleteEmployees(
  employeeIds: string[],
  actor: SessionContext,
  meta: RequestMeta = {},
): Promise<BulkResult> {
  requirePermission(actor, "employee.delete");
  const ids = await requireExistingEmployeeIds(employeeIds);
  const result: BulkResult = { succeeded: 0, failed: 0, errors: [] };
  for (const id of ids) {
    try {
      await deleteEmployee(id, actor, meta);
      result.succeeded++;
    } catch (err) {
      result.failed++;
      result.errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  return result;
}

export async function bulkAssignShift(
  employeeIds: string[],
  shiftId: string,
  actor: SessionContext,
  meta: RequestMeta = {},
): Promise<BulkResult> {
  requirePermission(actor, "employee.manage");
  const ids = await requireExistingEmployeeIds(employeeIds);
  const result: BulkResult = { succeeded: 0, failed: 0, errors: [] };
  for (const id of ids) {
    try {
      await updateEmployee(id, { shiftId }, actor, meta);
      result.succeeded++;
    } catch (err) {
      result.failed++;
      result.errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  return result;
}
