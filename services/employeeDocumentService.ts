import "server-only";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/permissions";
import { recordAudit } from "@/services/auditService";
import { NotFoundError, type RequestMeta } from "@/services/employeeService";
import type { SessionContext } from "@/types/session";
import type { AttachEmployeeDocumentInput } from "@/lib/validation/employeeDocument";

export async function listEmployeeDocuments(employeeId: string, actor: SessionContext) {
  requirePermission(actor, "employee.manage");
  return prisma.employeeDocument.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" } });
}

/** Self-service: an employee's own documents, no admin permission required. */
export async function listMyDocuments(actor: SessionContext) {
  if (!actor.employeeId) throw new NotFoundError("No employee profile linked to this account");
  return prisma.employeeDocument.findMany({
    where: { employeeId: actor.employeeId },
    orderBy: { createdAt: "desc" },
  });
}

export async function attachEmployeeDocument(
  input: AttachEmployeeDocumentInput,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  // Employees may upload to their own record; anything else requires admin rights.
  if (actor.employeeId !== input.employeeId) {
    requirePermission(actor, "employee.manage");
  }

  const doc = await prisma.employeeDocument.create({
    data: {
      employeeId: input.employeeId,
      type: input.type,
      fileName: input.fileName,
      storagePath: input.storagePath,
      uploadedByUserId: actor.userId,
    },
  });

  await recordAudit({
    actorUserId: actor.userId,
    action: "employee.document_uploaded",
    targetEntity: "employee",
    targetId: input.employeeId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { type: input.type, fileName: input.fileName },
  });

  return doc;
}

export async function deleteEmployeeDocument(documentId: string, actor: SessionContext, meta: RequestMeta = {}) {
  const existing = await prisma.employeeDocument.findUnique({ where: { id: documentId } });
  if (!existing) throw new NotFoundError("Document not found");

  // Employees may remove documents they uploaded themselves; anything else
  // (including admin-uploaded documents on their own record) requires admin rights.
  if (existing.uploadedByUserId !== actor.userId) {
    requirePermission(actor, "employee.manage");
  }

  await prisma.employeeDocument.delete({ where: { id: documentId } });

  await recordAudit({
    actorUserId: actor.userId,
    action: "employee.document_deleted",
    targetEntity: "employee",
    targetId: existing.employeeId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { type: existing.type, fileName: existing.fileName },
  });
}
