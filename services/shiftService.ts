import "server-only";
import type { Prisma } from "@/lib/prisma-client/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/permissions";
import { recordAudit } from "@/services/auditService";
import { NotFoundError, type RequestMeta } from "@/services/employeeService";
import { ConflictError } from "@/services/attendanceService";
import type { SessionContext } from "@/types/session";
import type { CreateShiftInput, UpdateShiftInput } from "@/lib/validation/shift";

export async function listShifts() {
  return prisma.shift.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

// Unlike listShifts(), this includes inactive shifts too — used by the admin
// shift-management page so a deactivated shift can still be found and
// reactivated, instead of disappearing from view entirely.
export async function listAllShiftsForAdmin() {
  const shifts = await prisma.shift.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: { where: { deletedAt: null } } } } },
  });
  return shifts.map((shift) => ({ ...shift, employeeCount: shift._count.employees }));
}

export async function getShiftById(shiftId: string) {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) throw new NotFoundError("Shift not found");
  return shift;
}

export async function createShift(
  input: CreateShiftInput,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "employee.manage");

  const shift = await prisma.shift.create({ data: input });

  await recordAudit({
    actorUserId: actor.userId,
    action: "shift.created",
    targetEntity: "shift",
    targetId: shift.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    after: shift as Prisma.InputJsonValue,
  });

  return shift;
}

export async function updateShift(
  shiftId: string,
  input: UpdateShiftInput,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "employee.manage");

  const existing = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!existing) throw new NotFoundError("Shift not found");

  // Shift changes are effective-dated: only `employees.shiftId` (current
  // assignment) is affected going forward. Historical attendance rows keep
  // the shift they snapshotted at check-in time, so this update never
  // retroactively alters past hours/late/overtime figures.
  const updated = await prisma.shift.update({ where: { id: shiftId }, data: input });

  await recordAudit({
    actorUserId: actor.userId,
    action: "shift.updated",
    targetEntity: "shift",
    targetId: shiftId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    before: existing as Prisma.InputJsonValue,
    after: updated as Prisma.InputJsonValue,
  });

  return updated;
}

export async function deactivateShift(
  shiftId: string,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "employee.manage");

  const existing = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!existing) throw new NotFoundError("Shift not found");

  const updated = await prisma.shift.update({ where: { id: shiftId }, data: { isActive: false } });

  await recordAudit({
    actorUserId: actor.userId,
    action: "shift.deactivated",
    targetEntity: "shift",
    targetId: shiftId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return updated;
}

export async function activateShift(
  shiftId: string,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "employee.manage");

  const existing = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!existing) throw new NotFoundError("Shift not found");

  const updated = await prisma.shift.update({ where: { id: shiftId }, data: { isActive: true } });

  await recordAudit({
    actorUserId: actor.userId,
    action: "shift.activated",
    targetEntity: "shift",
    targetId: shiftId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return updated;
}

export async function deleteShift(
  shiftId: string,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "employee.manage");

  const existing = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!existing) throw new NotFoundError("Shift not found");

  const [assignedEmployees, attendanceRows] = await Promise.all([
    prisma.employee.count({ where: { shiftId } }),
    prisma.attendance.count({ where: { shiftId } }),
  ]);
  if (assignedEmployees > 0 || attendanceRows > 0) {
    throw new ConflictError(
      "This shift has employees or attendance history attached — deactivate it instead of deleting.",
    );
  }

  await prisma.shift.delete({ where: { id: shiftId } });

  await recordAudit({
    actorUserId: actor.userId,
    action: "shift.deleted",
    targetEntity: "shift",
    targetId: shiftId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    before: existing as Prisma.InputJsonValue,
  });
}
