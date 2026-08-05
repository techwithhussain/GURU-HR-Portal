"use server";

import { headers } from "next/headers";
import * as notificationService from "@/services/notificationService";
import { requireSession } from "@/services/sessionService";
import { toUserMessage } from "@/lib/errors/toUserMessage";
import { getClientIp } from "@/lib/network/getClientIp";
import { sendAdminAnnouncementSchema } from "@/lib/validation/notification";

async function requestMeta() {
  const hdrs = await headers();
  return { ip: getClientIp(hdrs), userAgent: hdrs.get("user-agent") };
}

export interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function sendAdminAnnouncementAction(input: unknown): Promise<ActionResult<{ recipientCount: number }>> {
  const parsed = sendAdminAnnouncementSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    const result = await notificationService.sendAdminAnnouncement(parsed.data, session, meta);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to send announcement") };
  }
}

export async function listMyNotificationsAction() {
  const session = await requireSession();
  return notificationService.listMyNotifications(session);
}

export async function getUnreadCountAction() {
  const session = await requireSession();
  return notificationService.getUnreadCount(session);
}

export async function markAsReadAction(notificationId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await notificationService.markAsRead(notificationId, session);
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to mark as read") };
  }
}

export async function markAllAsReadAction(): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await notificationService.markAllAsRead(session);
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to mark all as read") };
  }
}
