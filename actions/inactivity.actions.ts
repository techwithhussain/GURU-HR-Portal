"use server";

import { revalidatePath } from "next/cache";
import * as inactivityService from "@/services/inactivityService";
import { requireSession } from "@/services/sessionService";
import { toUserMessage } from "@/lib/errors/toUserMessage";
import type { ActionResult } from "@/actions/attendance.actions";

export async function getInactivityEventsAction(status?: "PENDING" | "IGNORED" | "NOTED") {
  const session = await requireSession();
  void session; // validates session exists
  return inactivityService.getInactivityEvents({ status });
}

export async function reviewInactivityEventAction(
  eventId: string,
  action: "IGNORED" | "NOTED",
  adminNote?: string,
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await inactivityService.reviewInactivityEvent(eventId, action, adminNote ?? null, session);
    revalidatePath("/admin/inactivity");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to review event") };
  }
}
