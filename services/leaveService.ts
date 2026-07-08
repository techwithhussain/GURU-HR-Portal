import "server-only";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/permissions";
import { recordAudit } from "@/services/auditService";
import { NotFoundError, type RequestMeta } from "@/services/employeeService";
import { ConflictError } from "@/services/attendanceService";
import { notifyUser, notifyUsers } from "@/services/notificationService";
import type { SessionContext } from "@/types/session";
import type { ApplyLeaveInput, DecideLeaveInput, SetLeaveBalanceInput } from "@/lib/validation/leave";

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

export async function applyLeave(input: ApplyLeaveInput, actor: SessionContext, meta: RequestMeta = {}) {
  requirePermission(actor, "leave.apply");

  const employeeId = actor.employeeId;
  if (!employeeId) throw new Error("No employee profile linked to this account");

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

  const days = inclusiveDayCount(input.startDate, input.endDate);
  const year = input.startDate.getUTCFullYear();

  const balance = await prisma.leaveBalance.upsert({
    where: { employeeId_type_year: { employeeId, type: input.type, year } },
    update: {},
    create: { employeeId, type: input.type, year, allocated: 0, used: 0 },
  });

  const remaining = Number(balance.allocated) - Number(balance.used);
  if (remaining < days) {
    throw new ConflictError(
      `Insufficient ${input.type} leave balance (${remaining} day(s) remaining) — contact HR to set your allocation.`,
    );
  }

  const leave = await prisma.leave.create({
    data: {
      employeeId,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      days,
      reason: input.reason,
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

  const [employeeWithManager, admins] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: { fullName: true },
    }),
    prisma.user.findMany({ where: { role: { name: "ADMIN" }, status: "ACTIVE" }, select: { id: true } }),
  ]);
  const approverUserIds = admins.map((u) => u.id);
  await notifyUsers(
    approverUserIds,
    "LEAVE_APPLIED",
    { leaveId: leave.id, employeeId, type: leave.type, days },
    {
      subject: `New leave request from ${employeeWithManager?.fullName ?? "an employee"}`,
      text: `${employeeWithManager?.fullName ?? "An employee"} has applied for ${days} day(s) of ${leave.type} leave (${input.startDate.toISOString().slice(0, 10)} to ${input.endDate.toISOString().slice(0, 10)}).`,
    },
  );

  return leave;
}

export async function listMyLeaves(employeeId: string) {
  return prisma.leave.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" } });
}

export async function getMyBalances(employeeId: string, year: number) {
  return prisma.leaveBalance.findMany({ where: { employeeId, year }, orderBy: { type: "asc" } });
}

export async function listPendingApprovals(actor: SessionContext) {
  requirePermission(actor, "leave.approve");

  return prisma.leave.findMany({
    where: { status: "APPLIED" },
    include: { employee: { select: { fullName: true } } },
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
    include: { employee: { select: { userId: true, shiftId: true } } },
  });
  if (!leave) throw new NotFoundError("Leave request not found");
  if (leave.status !== "APPLIED") throw new ConflictError("This leave request has already been decided.");

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
      await tx.leaveBalance.upsert({
        where: {
          employeeId_type_year: {
            employeeId: leave.employeeId,
            type: leave.type,
            year: leave.startDate.getUTCFullYear(),
          },
        },
        update: { used: { increment: leave.days } },
        create: {
          employeeId: leave.employeeId,
          type: leave.type,
          year: leave.startDate.getUTCFullYear(),
          allocated: 0,
          used: leave.days,
        },
      });

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
    { leaveId, type: leave.type, decisionReason: input.decisionReason },
    {
      subject: `Your ${leave.type} leave request was ${input.decision.toLowerCase()}`,
      text:
        input.decision === "APPROVED"
          ? `Your leave request (${leave.type}, ${leave.days} day(s)) has been approved.`
          : `Your leave request (${leave.type}, ${leave.days} day(s)) was rejected.${input.decisionReason ? ` Reason: ${input.decisionReason}` : ""}`,
    },
  );
}

export async function setLeaveBalance(
  input: SetLeaveBalanceInput,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "employee.manage");

  const balance = await prisma.leaveBalance.upsert({
    where: { employeeId_type_year: { employeeId: input.employeeId, type: input.type, year: input.year } },
    update: { allocated: input.allocated },
    create: {
      employeeId: input.employeeId,
      type: input.type,
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
