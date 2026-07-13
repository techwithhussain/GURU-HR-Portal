"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as companySettingsService from "@/services/companySettingsService";
import { requireSession } from "@/services/sessionService";
import { toUserMessage } from "@/lib/errors/toUserMessage";
import { getClientIp } from "@/lib/network/getClientIp";
import { updateCompanySettingsSchema } from "@/lib/validation/companySettings";

async function requestMeta() {
  const hdrs = await headers();
  return { ip: getClientIp(hdrs), userAgent: hdrs.get("user-agent") };
}

export interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getCompanySettingsAction() {
  const session = await requireSession();
  return companySettingsService.getCompanySettings(session);
}

export async function updateCompanySettingsAction(input: unknown): Promise<ActionResult> {
  const parsed = updateCompanySettingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await companySettingsService.updateCompanySettings(parsed.data, session, meta);
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to update settings") };
  }
}
