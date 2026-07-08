"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as leaveService from "@/services/leaveService";
import { requireSession } from "@/services/sessionService";
import { getClientIp } from "@/lib/network/getClientIp";
import { applyLeaveSchema, decideLeaveSchema, setLeaveBalanceSchema } from "@/lib/validation/leave";

async function requestMeta() {
  const hdrs = await headers();
  return { ip: getClientIp(hdrs), userAgent: hdrs.get("user-agent") };
}

export interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function applyLeaveAction(input: unknown): Promise<ActionResult<{ leaveId: string }>> {
  const parsed = applyLeaveSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    const leave = await leaveService.applyLeave(parsed.data, session, meta);
    revalidatePath("/leave");
    return { success: true, data: { leaveId: leave.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to apply for leave" };
  }
}

export async function listMyLeavesAction() {
  const session = await requireSession();
  if (!session.employeeId) return [];
  return leaveService.listMyLeaves(session.employeeId);
}

export async function getMyBalancesAction(year: number) {
  const session = await requireSession();
  if (!session.employeeId) return [];
  return leaveService.getMyBalances(session.employeeId, year);
}

export async function listPendingApprovalsAction() {
  const session = await requireSession();
  return leaveService.listPendingApprovals(session);
}

export async function decideLeaveAction(leaveId: string, input: unknown): Promise<ActionResult> {
  const parsed = decideLeaveSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await leaveService.decideLeave(leaveId, parsed.data, session, meta);
    revalidatePath("/admin/leave");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to decide on leave request" };
  }
}

export async function setLeaveBalanceAction(input: unknown): Promise<ActionResult> {
  const parsed = setLeaveBalanceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await leaveService.setLeaveBalance(parsed.data, session, meta);
    revalidatePath("/admin/leave");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to set leave balance" };
  }
}
