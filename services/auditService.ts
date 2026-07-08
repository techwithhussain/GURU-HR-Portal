import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface AuditEntryInput {
  actorUserId?: string | null;
  action: string;
  targetEntity: string;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}

/** Appends an entry to the audit log. Never update or delete rows in this table. */
export async function recordAudit(entry: AuditEntryInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      targetEntity: entry.targetEntity,
      targetId: entry.targetId ?? null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      beforeJson: entry.before,
      afterJson: entry.after,
      metadata: entry.metadata,
    },
  });
}
