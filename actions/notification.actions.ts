"use server";

import * as notificationService from "@/services/notificationService";
import { requireSession } from "@/services/sessionService";
import { toUserMessage } from "@/lib/errors/toUserMessage";

export interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
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
