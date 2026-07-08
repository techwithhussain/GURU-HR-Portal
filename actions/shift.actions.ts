"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as shiftService from "@/services/shiftService";
import { requireSession } from "@/services/sessionService";
import { getClientIp } from "@/lib/network/getClientIp";
import { requirePermission } from "@/lib/rbac/permissions";
import { createShiftSchema, updateShiftSchema } from "@/lib/validation/shift";

async function requestMeta() {
  const hdrs = await headers();
  return { ip: getClientIp(hdrs), userAgent: hdrs.get("user-agent") };
}

export interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createShiftAction(input: unknown): Promise<ActionResult<{ shiftId: string }>> {
  const parsed = createShiftSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    const shift = await shiftService.createShift(parsed.data, session, meta);
    revalidatePath("/admin/shifts");
    return { success: true, data: { shiftId: shift.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create shift" };
  }
}

export async function updateShiftAction(shiftId: string, input: unknown): Promise<ActionResult> {
  const parsed = updateShiftSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await shiftService.updateShift(shiftId, parsed.data, session, meta);
    revalidatePath("/admin/shifts");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update shift" };
  }
}

export async function deactivateShiftAction(shiftId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await shiftService.deactivateShift(shiftId, session, meta);
    revalidatePath("/admin/shifts");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to deactivate shift" };
  }
}

export async function activateShiftAction(shiftId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await shiftService.activateShift(shiftId, session, meta);
    revalidatePath("/admin/shifts");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to activate shift" };
  }
}

export async function deleteShiftAction(shiftId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await shiftService.deleteShift(shiftId, session, meta);
    revalidatePath("/admin/shifts");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete shift" };
  }
}

export async function listShiftsAction() {
  const session = await requireSession();
  requirePermission(session, "employee.manage");
  return shiftService.listShifts();
}

export async function listAllShiftsAction() {
  const session = await requireSession();
  requirePermission(session, "employee.manage");
  return shiftService.listAllShiftsForAdmin();
}

export async function getShiftAction(shiftId: string) {
  const session = await requireSession();
  requirePermission(session, "employee.manage");
  return shiftService.getShiftById(shiftId);
}
