import { prisma } from "@/lib/prisma";
import { isIpAllowed } from "@/lib/network/ipAllowlist";

/**
 * The allowlist is disabled (permissive) whenever `company_settings.officeIps`
 * is empty — this is the default until real office IP ranges are configured.
 */
export async function checkIpAllowed(ip: string | null): Promise<boolean> {
  const settings = await prisma.companySetting.findFirst({ select: { officeIps: true } });
  const cidrs = Array.isArray(settings?.officeIps) ? (settings.officeIps as string[]) : [];

  if (cidrs.length === 0) return true;
  if (!ip) return false;

  return isIpAllowed(ip, cidrs);
}
