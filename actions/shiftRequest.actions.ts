"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as shiftRequestService from "@/services/shiftRequestService";
import { requireSession } from "@/services/sessionService";
import { toUserMessage } from "@/lib/errors/toUserMessage";
import { getClientIp } from "@/lib/network/getClientIp";
import {
  createShiftChangeRequestSchema,
  reviewShiftChangeRequestSchema,
} from "@/lib/validation/shift";

async function requestMeta() {
  const hdrs = await headers();
  return { ip: getClientIp(hdrs), userAgent: hdrs.get("user-agent") };
}

export interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function submitShiftChangeRequestAction(input: unknown): Promise<ActionResult> {
  const parsed = createShiftChangeRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await shiftRequestService.createShiftChangeRequest(parsed.data, session, meta);
    revalidatePath("/dashboard");
    revalidatePath("/profile");
    revalidatePath("/admin/shifts");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to submit shift change request") };
  }
}

export async function getMyShiftChangeRequestsAction() {
  const session = await requireSession();
  return shiftRequestService.listMyShiftChangeRequests(session);
}

export async function listAllShiftChangeRequestsAction(status?: "PENDING" | "APPROVED" | "REJECTED") {
  const session = await requireSession();
  return shiftRequestService.listAllShiftChangeRequestsForAdmin(status);
}

export async function reviewShiftChangeRequestAction(
  requestId: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = reviewShiftChangeRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await shiftRequestService.reviewShiftChangeRequest(requestId, parsed.data, session, meta);
    revalidatePath("/admin/shifts");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/employees");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to review shift request") };
  }
}
