import "server-only";
import type { Prisma } from "@/lib/prisma-client/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/permissions";
import { recordAudit } from "@/services/auditService";
import type { RequestMeta } from "@/services/employeeService";
import type { SessionContext } from "@/types/session";
import type { UpdateCompanySettingsInput } from "@/lib/validation/companySettings";

export async function getCompanySettings(actor: SessionContext) {
  requirePermission(actor, "settings.manage");
  return prisma.companySetting.findFirst();
}

export async function updateCompanySettings(
  input: UpdateCompanySettingsInput,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "settings.manage");

  const existing = await prisma.companySetting.findFirst();
  const settings = existing
    ? await prisma.companySetting.update({ where: { id: existing.id }, data: input })
    : await prisma.companySetting.create({ data: input });

  await recordAudit({
    actorUserId: actor.userId,
    action: "company_settings.updated",
    targetEntity: "company_settings",
    targetId: settings.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    before: existing as Prisma.InputJsonValue,
    after: settings as Prisma.InputJsonValue,
  });

  return settings;
}
