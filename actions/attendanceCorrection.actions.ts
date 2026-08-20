"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as attendanceCorrectionService from "@/services/attendanceCorrectionService";
import { requireSession } from "@/services/sessionService";
import { toUserMessage } from "@/lib/errors/toUserMessage";
import { getClientIp } from "@/lib/network/getClientIp";
import {
  createAttendanceCorrectionRequestSchema,
  reviewAttendanceCorrectionRequestSchema,
} from "@/lib/validation/attendance";

async function requestMeta() {
  const hdrs = await headers();
  return { ip: getClientIp(hdrs), userAgent: hdrs.get("user-agent") };
}

export interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function submitAttendanceCorrectionAction(input: unknown): Promise<ActionResult> {
  const parsed = createAttendanceCorrectionRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await attendanceCorrectionService.createAttendanceCorrectionRequest(parsed.data, session, meta);
    revalidatePath("/dashboard");
    revalidatePath("/reports/attendance");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to submit attendance correction") };
  }
}

export async function getMyAttendanceCorrectionsAction() {
  const session = await requireSession();
  return attendanceCorrectionService.listMyAttendanceCorrectionRequests(session);
}

export async function listAllAttendanceCorrectionsAction(status?: "PENDING" | "APPROVED" | "REJECTED") {
  const session = await requireSession();
  return attendanceCorrectionService.listAllAttendanceCorrectionRequestsForAdmin(status);
}

export async function reviewAttendanceCorrectionAction(
  requestId: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = reviewAttendanceCorrectionRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await attendanceCorrectionService.reviewAttendanceCorrectionRequest(requestId, parsed.data, session, meta);
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/leave");
    revalidatePath("/reports/attendance");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to review attendance correction") };
  }
}
