"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as employeeDocumentService from "@/services/employeeDocumentService";
import { requireSession } from "@/services/sessionService";
import { getClientIp } from "@/lib/network/getClientIp";
import { attachEmployeeDocumentSchema } from "@/lib/validation/employeeDocument";

async function requestMeta() {
  const hdrs = await headers();
  return { ip: getClientIp(hdrs), userAgent: hdrs.get("user-agent") };
}

export interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function attachEmployeeDocumentAction(input: unknown): Promise<ActionResult> {
  const parsed = attachEmployeeDocumentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await employeeDocumentService.attachEmployeeDocument(parsed.data, session, meta);
    revalidatePath(`/admin/employees/${parsed.data.employeeId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to attach document" };
  }
}

export async function deleteEmployeeDocumentAction(documentId: string, employeeId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await employeeDocumentService.deleteEmployeeDocument(documentId, session, meta);
    revalidatePath(`/admin/employees/${employeeId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete document" };
  }
}
