"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as leaveService from "@/services/leaveService";
import { requireSession } from "@/services/sessionService";
import { getClientIp } from "@/lib/network/getClientIp";
import {
  applyLeaveSchema,
  cancelLeaveSchema,
  decideLeaveSchema,
  setLeaveBalanceSchema,
  updateLeaveSchema,
} from "@/lib/validation/leave";
import type { LeaveListFilters } from "@/services/leaveService";

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

export async function listAllLeavesAction(filters: LeaveListFilters) {
  const session = await requireSession();
  return leaveService.listAllLeaves(filters, session);
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

export async function cancelLeaveAction(leaveId: string, input: unknown): Promise<ActionResult> {
  const parsed = cancelLeaveSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await leaveService.cancelLeave(leaveId, parsed.data, session, meta);
    revalidatePath("/leave");
    revalidatePath("/admin/leave");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to cancel leave request" };
  }
}

export async function updateLeaveAction(leaveId: string, input: unknown): Promise<ActionResult> {
  const parsed = updateLeaveSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await leaveService.updateLeave(leaveId, parsed.data, session, meta);
    revalidatePath("/admin/leave");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update leave request" };
  }
}

export async function deleteLeaveAction(leaveId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await leaveService.deleteLeaveRecord(leaveId, session, meta);
    revalidatePath("/admin/leave");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete leave request" };
  }
}

export async function getLeaveDetailAction(leaveId: string) {
  const session = await requireSession();
  return leaveService.getLeaveDetail(leaveId, session);
}

export async function getLeaveCalendarAction(year: number, month: number) {
  await requireSession();
  return leaveService.getLeaveCalendarEvents(year, month);
}

export async function listAllBalancesAction(year: number) {
  const session = await requireSession();
  return leaveService.listAllBalances(year, session);
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
