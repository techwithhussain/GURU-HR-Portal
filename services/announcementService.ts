import "server-only";
import { prisma } from "@/lib/prisma";
import type { SessionContext } from "@/types/session";

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  authorName: string;
}

/** Get all active announcements (not expired), pinned first */
export async function getActiveAnnouncements(): Promise<AnnouncementItem[]> {
  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 20,
    include: { author: { select: { employee: { select: { fullName: true } } } } },
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    isPinned: r.isPinned,
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
    authorName: r.author.employee?.fullName ?? "Admin",
  }));
}

/** Get all announcements (admin view — includes expired) */
export async function getAllAnnouncements(): Promise<AnnouncementItem[]> {
  const rows = await prisma.announcement.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { employee: { select: { fullName: true } } } } },
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    isPinned: r.isPinned,
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
    authorName: r.author.employee?.fullName ?? "Admin",
  }));
}

/** Create a new announcement (admin only) */
export async function createAnnouncement(
  actor: SessionContext,
  data: { title: string; body: string; isPinned: boolean; expiresAt?: Date | null },
): Promise<void> {
  if (actor.roleName !== "ADMIN") throw new Error("Forbidden");
  await prisma.announcement.create({
    data: {
      title: data.title,
      body: data.body,
      isPinned: data.isPinned,
      expiresAt: data.expiresAt ?? null,
      authorId: actor.userId,
    },
  });
}

/** Delete an announcement (admin only) */
export async function deleteAnnouncement(actor: SessionContext, id: string): Promise<void> {
  if (actor.roleName !== "ADMIN") throw new Error("Forbidden");
  await prisma.announcement.delete({ where: { id } });
}

/** Toggle pin status (admin only) */
export async function toggleAnnouncementPin(actor: SessionContext, id: string): Promise<void> {
  if (actor.roleName !== "ADMIN") throw new Error("Forbidden");
  const current = await prisma.announcement.findUniqueOrThrow({ where: { id }, select: { isPinned: true } });
  await prisma.announcement.update({ where: { id }, data: { isPinned: !current.isPinned } });
}
