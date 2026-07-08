import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/permissions";
import { employeeSelect } from "@/lib/rbac/fieldVisibility";
import { recordAudit } from "@/services/auditService";
import { revokeAllSessionsForUser } from "@/services/sessionService";
import { generateTempPassword, hashPassword } from "@/lib/password";
import type { SessionContext } from "@/types/session";
import type {
  CreateEmployeeInput,
  EmployeeSearchInput,
  UpdateEmployeeInput,
} from "@/lib/validation/employee";

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
        departmentId: input.departmentId,
        designationId: input.designationId,
        shiftId: input.shiftId,
        managerId: input.managerId,
        joiningDate: input.joiningDate,
        salary: input.salary,
        emergencyContact: input.emergencyContact,
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

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      fullName: input.fullName,
      phone: input.phone,
      departmentId: input.departmentId,
      designationId: input.designationId,
      shiftId: input.shiftId,
      managerId: input.managerId,
      salary: input.salary,
      emergencyContact: input.emergencyContact,
    },
    select: employeeSelect(actor),
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

export async function deactivateEmployee(
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
    prisma.employee.update({ where: { id: employeeId }, data: { status: "INACTIVE" } }),
    prisma.user.update({ where: { id: employee.userId }, data: { status: "INACTIVE" } }),
  ]);

  await revokeAllSessionsForUser(employee.userId);

  await recordAudit({
    actorUserId: actor.userId,
    action: "employee.deactivated",
    targetEntity: "employee",
    targetId: employeeId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    before: { status: employee.status },
    after: { status: "INACTIVE" },
  });
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
    select: { id: true, userId: true, deletedAt: true },
  });
  if (!employee || employee.deletedAt) throw new NotFoundError("Employee not found");

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

export async function searchEmployees(input: EmployeeSearchInput, actor: SessionContext) {
  requirePermission(actor, "employee.manage");

  const where: Prisma.EmployeeWhereInput = {
    deletedAt: null,
    ...(input.departmentId ? { departmentId: input.departmentId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.query ? { fullName: { contains: input.query, mode: "insensitive" } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      select: employeeSelect(actor),
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: { fullName: "asc" },
    }),
    prisma.employee.count({ where }),
  ]);

  return { items, total, page: input.page, pageSize: input.pageSize };
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
