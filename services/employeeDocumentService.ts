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

export async function attachEmployeeDocument(
  input: AttachEmployeeDocumentInput,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "employee.manage");

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
  requirePermission(actor, "employee.manage");

  const existing = await prisma.employeeDocument.findUnique({ where: { id: documentId } });
  if (!existing) throw new NotFoundError("Document not found");

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
