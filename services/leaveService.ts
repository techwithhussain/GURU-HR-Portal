import "server-only";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, hasPermission, ForbiddenError } from "@/lib/rbac/permissions";
import { recordAudit } from "@/services/auditService";
import { NotFoundError, type RequestMeta } from "@/services/employeeService";
import { ConflictError } from "@/services/attendanceService";
import { notifyUser, notifyUsers } from "@/services/notificationService";
import { holidaySchema } from "@/lib/validation/companySettings";
import type { SessionContext } from "@/types/session";
import type {
  ApplyLeaveInput,
  CancelLeaveInput,
  DecideLeaveInput,
  SetLeaveBalanceInput,
  UpdateLeaveInput,
} from "@/lib/validation/leave";

function toUtcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function inclusiveDayCount(startDate: Date, endDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((toUtcDateOnly(endDate).getTime() - toUtcDateOnly(startDate).getTime()) / msPerDay) + 1;
}

function eachDateInRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const cursor = toUtcDateOnly(startDate);
  const end = toUtcDateOnly(endDate);
  while (cursor.getTime() <= end.getTime()) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function futureDatesOnly(dates: Date[]): Date[] {
  const today = toUtcDateOnly(new Date());
  return dates.filter((d) => d.getTime() >= today.getTime());
}

async function requireLeaveType(typeId: string) {
  const type = await prisma.leaveType.findUnique({ where: { id: typeId } });
  if (!type) throw new NotFoundError("Leave type not found");
  return type;
}

export async function applyLeave(input: ApplyLeaveInput, actor: SessionContext, meta: RequestMeta = {}) {
  requirePermission(actor, "leave.apply");

  const employeeId = actor.employeeId;
  if (!employeeId) throw new Error("No employee profile linked to this account");

  const todayUtc = toUtcDateOnly(new Date());
  if (toUtcDateOnly(input.startDate).getTime() < todayUtc.getTime() && actor.roleName !== "ADMIN") {
    throw new ConflictError("Leave cannot be applied for a past date.");
  }

  const type = await requireLeaveType(input.typeId);
  if (type.requiresAttachment && !input.attachmentPath) {
    throw new ConflictError(`${type.name} requires an attachment (e.g. a medical certificate).`);
  }

  const overlapping = await prisma.leave.findFirst({
    where: {
      employeeId,
      status: { in: ["APPLIED", "APPROVED"] },
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
    },
  });
  if (overlapping) {
    throw new ConflictError("You already have a leave request that overlaps these dates.");
  }

  const days = input.isHalfDay ? 0.5 : inclusiveDayCount(input.startDate, input.endDate);
  const year = input.startDate.getUTCFullYear();

  if (type.defaultAllocationDays != null) {
    const balance = await prisma.leaveBalance.upsert({
      where: { employeeId_typeId_year: { employeeId, typeId: type.id, year } },
      update: {},
      create: { employeeId, typeId: type.id, year, allocated: type.defaultAllocationDays, used: 0 },
    });

    const remaining = Number(balance.allocated) - Number(balance.used);
    if (remaining < days) {
      throw new ConflictError(
        `Insufficient ${type.name} balance (${remaining} day(s) remaining) — contact Admin to adjust your allocation.`,
      );
    }
  }

  const leave = await prisma.leave.create({
    data: {
      employeeId,
      typeId: type.id,
      startDate: input.startDate,
      endDate: input.endDate,
      days,
      isHalfDay: input.isHalfDay,
      reason: input.reason,
      attachmentPath: input.attachmentPath,
      attachmentFileName: input.attachmentFileName,
    },
  });

  await recordAudit({
    actorUserId: actor.userId,
    action: "leave.applied",
    targetEntity: "leave",
    targetId: leave.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    after: leave as Prisma.InputJsonValue,
  });

  const [employeeWithName, admins] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId }, select: { fullName: true } }),
    prisma.user.findMany({ where: { role: { name: "ADMIN" }, status: "ACTIVE" }, select: { id: true } }),
  ]);
  const approverUserIds = admins.map((u) => u.id);
  await notifyUsers(
    approverUserIds,
    "LEAVE_APPLIED",
    { leaveId: leave.id, employeeId, typeId: type.id, days },
    {
      subject: `New leave request from ${employeeWithName?.fullName ?? "an employee"}`,
      text: `${employeeWithName?.fullName ?? "An employee"} has applied for ${days} day(s) of ${type.name} (${input.startDate.toISOString().slice(0, 10)} to ${input.endDate.toISOString().slice(0, 10)}).`,
    },
  );

  return leave;
}

export async function listMyLeaves(employeeId: string) {
  return prisma.leave.findMany({
    where: { employeeId },
    include: { type: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMyBalances(employeeId: string, year: number) {
  return prisma.leaveBalance.findMany({
    where: { employeeId, year },
    include: { type: true },
    orderBy: { type: { name: "asc" } },
  });
}

export async function listAllBalances(year: number, actor: SessionContext) {
  requirePermission(actor, "employee.manage");

  return prisma.leaveBalance.findMany({
    where: { year },
    include: {
      type: true,
      employee: { select: { fullName: true, user: { select: { employeeCode: true } } } },
    },
    orderBy: [{ employee: { fullName: "asc" } }, { type: { name: "asc" } }],
  });
}

export interface LeaveListFilters {
  employeeId?: string;
  departmentId?: string;
  designationId?: string;
  typeId?: string;
  status?: "APPLIED" | "APPROVED" | "REJECTED" | "CANCELLED";
  startDate?: Date;
  endDate?: Date;
}

export async function listAllLeaves(filters: LeaveListFilters, actor: SessionContext) {
  requirePermission(actor, "leave.approve");

  return prisma.leave.findMany({
    where: {
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.typeId ? { typeId: filters.typeId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.startDate && filters.endDate
        ? { startDate: { lte: filters.endDate }, endDate: { gte: filters.startDate } }
        : {}),
      ...(filters.departmentId || filters.designationId
        ? {
            employee: {
              ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
              ...(filters.designationId ? { designationId: filters.designationId } : {}),
            },
          }
        : {}),
    },
    include: {
      employee: {
        select: {
          fullName: true,
          department: { select: { name: true } },
          designation: { select: { name: true } },
          user: { select: { employeeCode: true } },
        },
      },
      type: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listPendingApprovals(actor: SessionContext) {
  requirePermission(actor, "leave.approve");

  return prisma.leave.findMany({
    where: { status: "APPLIED" },
    include: { employee: { select: { fullName: true } }, type: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function decideLeave(
  leaveId: string,
  input: DecideLeaveInput,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "leave.approve");

  const leave = await prisma.leave.findUnique({
    where: { id: leaveId },
    include: { employee: { select: { userId: true, shiftId: true } }, type: true },
  });
  if (!leave) throw new NotFoundError("Leave request not found");
  if (leave.status !== "APPLIED") throw new ConflictError("This leave request has already been decided.");
  if (leave.employeeId === actor.employeeId) {
    throw new ConflictError("You cannot approve or reject your own leave request.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.leave.update({
      where: { id: leaveId },
      data: {
        status: input.decision,
        approverId: actor.userId,
        decisionReason: input.decisionReason,
        decidedAt: new Date(),
      },
    });

    if (input.decision === "APPROVED") {
      if (leave.type.defaultAllocationDays != null) {
        await tx.leaveBalance.upsert({
          where: {
            employeeId_typeId_year: {
              employeeId: leave.employeeId,
              typeId: leave.typeId,
              year: leave.startDate.getUTCFullYear(),
            },
          },
          update: { used: { increment: leave.days } },
          create: {
            employeeId: leave.employeeId,
            typeId: leave.typeId,
            year: leave.startDate.getUTCFullYear(),
            allocated: leave.type.defaultAllocationDays ?? 0,
            used: leave.days,
          },
        });
      }

      if (leave.employee.shiftId) {
        for (const date of eachDateInRange(leave.startDate, leave.endDate)) {
          try {
            await tx.attendance.create({
              data: {
                employeeId: leave.employeeId,
                attendanceDate: date,
                shiftId: leave.employee.shiftId,
                status: "ON_LEAVE",
              },
            });
          } catch (err) {
            if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
            // A real attendance row (e.g. a punch) already exists for this date — never overwrite it.
          }
        }
      }
    }
  });

  await recordAudit({
    actorUserId: actor.userId,
    action: input.decision === "APPROVED" ? "leave.approved" : "leave.rejected",
    targetEntity: "leave",
    targetId: leaveId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { decisionReason: input.decisionReason },
  });

  await notifyUser(
    leave.employee.userId,
    input.decision === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
    { leaveId, typeId: leave.typeId, decisionReason: input.decisionReason },
    {
      subject: `Your ${leave.type.name} request was ${input.decision.toLowerCase()}`,
      text:
        input.decision === "APPROVED"
          ? `Your leave request (${leave.type.name}, ${leave.days} day(s)) has been approved. ${input.decisionReason}`
          : `Your leave request (${leave.type.name}, ${leave.days} day(s)) was rejected. Reason: ${input.decisionReason}`,
    },
  );
}

async function reverseApprovedLeave(tx: Prisma.TransactionClient, leave: { id: string; employeeId: string; typeId: string; startDate: Date; endDate: Date; days: Prisma.Decimal }) {
  await tx.leaveBalance.updateMany({
    where: { employeeId: leave.employeeId, typeId: leave.typeId, year: leave.startDate.getUTCFullYear() },
    data: { used: { decrement: leave.days } },
  });

  const datesToClear = futureDatesOnly(eachDateInRange(leave.startDate, leave.endDate));
  if (datesToClear.length > 0) {
    await tx.attendance.deleteMany({
      where: {
        employeeId: leave.employeeId,
        status: "ON_LEAVE",
        attendanceDate: { in: datesToClear },
      },
    });
  }
}

export async function cancelLeave(
  leaveId: string,
  input: CancelLeaveInput,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  const leave = await prisma.leave.findUnique({
    where: { id: leaveId },
    include: { employee: { select: { userId: true } } },
  });
  if (!leave) throw new NotFoundError("Leave request not found");

  const isOwnLeave = actor.employeeId === leave.employeeId;
  const isAdmin = hasPermission(actor, "leave.approve");
  if (!isOwnLeave && !isAdmin) throw new ForbiddenError("leave.approve");
  if (isOwnLeave && !isAdmin && leave.status !== "APPLIED") {
    throw new ConflictError("Only a pending leave request can be cancelled.");
  }
  if (leave.status !== "APPLIED" && leave.status !== "APPROVED") {
    throw new ConflictError("This leave request cannot be cancelled.");
  }

  await prisma.$transaction(async (tx) => {
    if (leave.status === "APPROVED") {
      await reverseApprovedLeave(tx, leave);
    }
    await tx.leave.update({
      where: { id: leaveId },
      data: {
        status: "CANCELLED",
        cancelledByUserId: actor.userId,
        cancelledAt: new Date(),
        cancellationReason: input.reason,
      },
    });
  });

  await recordAudit({
    actorUserId: actor.userId,
    action: "leave.cancelled",
    targetEntity: "leave",
    targetId: leaveId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { reason: input.reason },
  });

  if (!isOwnLeave) {
    await notifyUser(
      leave.employee.userId,
      "LEAVE_CANCELLED",
      { leaveId, reason: input.reason },
      {
        subject: "Your leave request was cancelled",
        text: `Your leave request has been cancelled by an admin.${input.reason ? ` Reason: ${input.reason}` : ""}`,
      },
    );
  }
}

export async function updateLeave(
  leaveId: string,
  input: UpdateLeaveInput,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "leave.approve");

  const existing = await prisma.leave.findUnique({ where: { id: leaveId } });
  if (!existing) throw new NotFoundError("Leave request not found");
  if (existing.status !== "APPLIED") {
    throw new ConflictError("Only a pending leave request can be edited.");
  }
  if (existing.employeeId === actor.employeeId) {
    throw new ConflictError("You cannot edit your own leave request as an approver.");
  }

  const type = await requireLeaveType(input.typeId);

  const overlapping = await prisma.leave.findFirst({
    where: {
      id: { not: leaveId },
      employeeId: existing.employeeId,
      status: { in: ["APPLIED", "APPROVED"] },
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
    },
  });
  if (overlapping) throw new ConflictError("This change would overlap another leave request.");

  const days = input.isHalfDay ? 0.5 : inclusiveDayCount(input.startDate, input.endDate);

  const updated = await prisma.leave.update({
    where: { id: leaveId },
    data: {
      typeId: type.id,
      startDate: input.startDate,
      endDate: input.endDate,
      days,
      isHalfDay: input.isHalfDay,
      reason: input.reason,
      attachmentPath: input.attachmentPath,
      attachmentFileName: input.attachmentFileName,
    },
  });

  await recordAudit({
    actorUserId: actor.userId,
    action: "leave.edited",
    targetEntity: "leave",
    targetId: leaveId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    before: existing as Prisma.InputJsonValue,
    after: updated as Prisma.InputJsonValue,
  });

  return updated;
}

export async function deleteLeaveRecord(leaveId: string, actor: SessionContext, meta: RequestMeta = {}) {
  requirePermission(actor, "leave.approve");

  const existing = await prisma.leave.findUnique({ where: { id: leaveId } });
  if (!existing) throw new NotFoundError("Leave request not found");

  await prisma.$transaction(async (tx) => {
    if (existing.status === "APPROVED") {
      await reverseApprovedLeave(tx, existing);
    }
    await tx.leave.delete({ where: { id: leaveId } });
  });

  await recordAudit({
    actorUserId: actor.userId,
    action: "leave.deleted",
    targetEntity: "leave",
    targetId: leaveId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    before: existing as Prisma.InputJsonValue,
  });
}

export interface LeaveTimelineEvent {
  action: string;
  createdAt: string;
  metadata: unknown;
}

export async function getLeaveDetail(leaveId: string, actor: SessionContext) {
  const leave = await prisma.leave.findUnique({
    where: { id: leaveId },
    include: {
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
      type: true,
      approver: { select: { employee: { select: { fullName: true } } } },
      cancelledBy: { select: { employee: { select: { fullName: true } } } },
    },
  });
  if (!leave) throw new NotFoundError("Leave request not found");

  if (actor.employeeId !== leave.employeeId && !hasPermission(actor, "leave.approve")) {
    throw new ForbiddenError("leave.approve");
  }

  const auditRows = await prisma.auditLog.findMany({
    where: { targetEntity: "leave", targetId: leaveId },
    orderBy: { createdAt: "asc" },
    select: { action: true, createdAt: true, metadata: true },
  });

  const timeline: LeaveTimelineEvent[] = auditRows.map((row) => ({
    action: row.action,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata,
  }));

  return { leave, timeline };
}

export interface LeaveCalendarEvent {
  leaveId: string;
  employeeName: string;
  typeName: string;
  typeColor: string;
  startDate: string;
  endDate: string;
  status: string;
  isHalfDay: boolean;
}

export interface LeaveCalendarHoliday {
  date: string;
  name: string;
}

export async function getLeaveCalendarEvents(
  year: number,
  month: number, // 1-12
): Promise<{ events: LeaveCalendarEvent[]; holidays: LeaveCalendarHoliday[] }> {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));

  const [leaves, settings] = await Promise.all([
    prisma.leave.findMany({
      where: {
        status: { in: ["APPLIED", "APPROVED"] },
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      include: { employee: { select: { fullName: true } }, type: true },
      orderBy: { startDate: "asc" },
    }),
    prisma.companySetting.findFirst({ select: { holidayCalendar: true } }),
  ]);

  const holidaysParsed = holidaySchema.array().safeParse(settings?.holidayCalendar ?? []);
  const holidays = (holidaysParsed.success ? holidaysParsed.data : [])
    .filter((h) => h.date >= monthStart && h.date <= monthEnd)
    .map((h) => ({ date: h.date.toISOString().slice(0, 10), name: h.name }));

  const events: LeaveCalendarEvent[] = leaves.map((l) => ({
    leaveId: l.id,
    employeeName: l.employee.fullName,
    typeName: l.type.name,
    typeColor: l.type.color,
    startDate: l.startDate.toISOString().slice(0, 10),
    endDate: l.endDate.toISOString().slice(0, 10),
    status: l.status,
    isHalfDay: l.isHalfDay,
  }));

  return { events, holidays };
}

export async function setLeaveBalance(
  input: SetLeaveBalanceInput,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "employee.manage");

  const balance = await prisma.leaveBalance.upsert({
    where: { employeeId_typeId_year: { employeeId: input.employeeId, typeId: input.typeId, year: input.year } },
    update: { allocated: input.allocated },
    create: {
      employeeId: input.employeeId,
      typeId: input.typeId,
      year: input.year,
      allocated: input.allocated,
      used: 0,
    },
  });

  await recordAudit({
    actorUserId: actor.userId,
    action: "leave_balance.set",
    targetEntity: "leave_balance",
    targetId: balance.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    after: balance as Prisma.InputJsonValue,
  });

  return balance;
}
