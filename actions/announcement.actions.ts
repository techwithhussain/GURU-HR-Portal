"use server";

import * as announcementService from "@/services/announcementService";
import { requireSession } from "@/services/sessionService";
import { revalidatePath } from "next/cache";

export async function getActiveAnnouncementsAction() {
  await requireSession();
  return announcementService.getActiveAnnouncements();
}

export async function getAllAnnouncementsAction() {
  await requireSession();
  return announcementService.getAllAnnouncements();
}

export async function createAnnouncementAction(data: {
  title: string;
  body: string;
  isPinned: boolean;
  expiresAt?: string | null;
}) {
  const session = await requireSession();
  await announcementService.createAnnouncement(session, {
    title: data.title,
    body: data.body,
    isPinned: data.isPinned,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
  });
  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}

export async function deleteAnnouncementAction(id: string) {
  const session = await requireSession();
  await announcementService.deleteAnnouncement(session, id);
  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}

export async function toggleAnnouncementPinAction(id: string) {
  const session = await requireSession();
  await announcementService.toggleAnnouncementPin(session, id);
  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}
