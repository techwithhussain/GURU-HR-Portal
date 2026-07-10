"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as leaveTypeService from "@/services/leaveTypeService";
import { requireSession } from "@/services/sessionService";
import { getClientIp } from "@/lib/network/getClientIp";
import { requirePermission } from "@/lib/rbac/permissions";
import { createLeaveTypeSchema, updateLeaveTypeSchema } from "@/lib/validation/leaveType";

async function requestMeta() {
  const hdrs = await headers();
  return { ip: getClientIp(hdrs), userAgent: hdrs.get("user-agent") };
}

export interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createLeaveTypeAction(input: unknown): Promise<ActionResult<{ leaveTypeId: string }>> {
  const parsed = createLeaveTypeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    const leaveType = await leaveTypeService.createLeaveType(parsed.data, session, meta);
    revalidatePath("/admin/leave");
    return { success: true, data: { leaveTypeId: leaveType.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create leave type" };
  }
}

export async function updateLeaveTypeAction(leaveTypeId: string, input: unknown): Promise<ActionResult> {
  const parsed = updateLeaveTypeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await leaveTypeService.updateLeaveType(leaveTypeId, parsed.data, session, meta);
    revalidatePath("/admin/leave");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update leave type" };
  }
}

export async function deactivateLeaveTypeAction(leaveTypeId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await leaveTypeService.deactivateLeaveType(leaveTypeId, session, meta);
    revalidatePath("/admin/leave");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to deactivate leave type" };
  }
}

export async function activateLeaveTypeAction(leaveTypeId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await leaveTypeService.activateLeaveType(leaveTypeId, session, meta);
    revalidatePath("/admin/leave");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to activate leave type" };
  }
}

export async function deleteLeaveTypeAction(leaveTypeId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await leaveTypeService.deleteLeaveType(leaveTypeId, session, meta);
    revalidatePath("/admin/leave");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete leave type" };
  }
}

export async function listLeaveTypesAction() {
  await requireSession();
  return leaveTypeService.listLeaveTypes();
}

export async function listAllLeaveTypesAction() {
  const session = await requireSession();
  requirePermission(session, "settings.manage");
  return leaveTypeService.listAllLeaveTypesForAdmin();
}
