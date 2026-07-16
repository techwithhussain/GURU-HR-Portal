import "server-only";
import type { Prisma } from "@/lib/prisma-client/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/permissions";
import { recordAudit } from "@/services/auditService";
import { NotFoundError, type RequestMeta } from "@/services/employeeService";
import { ConflictError } from "@/services/attendanceService";
import type { SessionContext } from "@/types/session";
import type { CreateLeaveTypeInput, UpdateLeaveTypeInput } from "@/lib/validation/leaveType";

export async function listLeaveTypes() {
  return prisma.leaveType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

// Unlike listLeaveTypes(), this includes inactive types too — used by the
// admin Leave Types tab so a deactivated type stays visible/reactivatable.
export async function listAllLeaveTypesForAdmin() {
  return prisma.leaveType.findMany({ orderBy: { name: "asc" } });
}

export async function createLeaveType(
  input: CreateLeaveTypeInput,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "settings.manage");

  const leaveType = await prisma.leaveType.create({ data: input });

  await recordAudit({
    actorUserId: actor.userId,
    action: "leave_type.created",
    targetEntity: "leave_type",
    targetId: leaveType.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    after: leaveType as Prisma.InputJsonValue,
  });

  return leaveType;
}

export async function updateLeaveType(
  leaveTypeId: string,
  input: UpdateLeaveTypeInput,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "settings.manage");

  const existing = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!existing) throw new NotFoundError("Leave type not found");

  const updated = await prisma.leaveType.update({ where: { id: leaveTypeId }, data: input });

  await recordAudit({
    actorUserId: actor.userId,
    action: "leave_type.updated",
    targetEntity: "leave_type",
    targetId: leaveTypeId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    before: existing as Prisma.InputJsonValue,
    after: updated as Prisma.InputJsonValue,
  });

  return updated;
}

export async function deactivateLeaveType(leaveTypeId: string, actor: SessionContext, meta: RequestMeta = {}) {
  requirePermission(actor, "settings.manage");

  const existing = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!existing) throw new NotFoundError("Leave type not found");

  const updated = await prisma.leaveType.update({ where: { id: leaveTypeId }, data: { isActive: false } });

  await recordAudit({
    actorUserId: actor.userId,
    action: "leave_type.deactivated",
    targetEntity: "leave_type",
    targetId: leaveTypeId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return updated;
}

export async function activateLeaveType(leaveTypeId: string, actor: SessionContext, meta: RequestMeta = {}) {
  requirePermission(actor, "settings.manage");

  const existing = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!existing) throw new NotFoundError("Leave type not found");

  const updated = await prisma.leaveType.update({ where: { id: leaveTypeId }, data: { isActive: true } });

  await recordAudit({
    actorUserId: actor.userId,
    action: "leave_type.activated",
    targetEntity: "leave_type",
    targetId: leaveTypeId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return updated;
}

export async function deleteLeaveType(leaveTypeId: string, actor: SessionContext, meta: RequestMeta = {}) {
  requirePermission(actor, "settings.manage");

  const existing = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!existing) throw new NotFoundError("Leave type not found");

  const [leaveRows, balanceRows] = await Promise.all([
    prisma.leave.count({ where: { typeId: leaveTypeId } }),
    prisma.leaveBalance.count({ where: { typeId: leaveTypeId } }),
  ]);
  if (leaveRows > 0 || balanceRows > 0) {
    throw new ConflictError(
      "This leave type has requests or balances attached — deactivate it instead of deleting.",
    );
  }

  await prisma.leaveType.delete({ where: { id: leaveTypeId } });

  await recordAudit({
    actorUserId: actor.userId,
    action: "leave_type.deleted",
    targetEntity: "leave_type",
    targetId: leaveTypeId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    before: existing as Prisma.InputJsonValue,
  });
}
