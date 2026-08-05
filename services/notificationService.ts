import "server-only";
import type { Prisma } from "@/lib/prisma-client/client";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { requirePermission } from "@/lib/rbac/permissions";
import { recordAudit } from "@/services/auditService";
import { NotFoundError } from "@/services/employeeService";
import type { RequestMeta } from "@/services/employeeService";
import type { SessionContext } from "@/types/session";
import type { NotificationType } from "@/lib/validation/notification";
import type { SendAdminAnnouncementInput } from "@/lib/validation/notification";

export interface NotificationEmail {
  subject: string;
  text: string;
}

async function sendEmailToUser(userId: string, email: NotificationEmail): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return;
  await sendMail({ to: user.email, subject: email.subject, text: email.text });
}

export async function notifyUser(
  userId: string,
  type: NotificationType,
  payload: Prisma.InputJsonValue,
  email?: NotificationEmail,
): Promise<void> {
  await prisma.notification.create({ data: { userId, type, payload } });
  if (email) await sendEmailToUser(userId, email);
}

export async function notifyUsers(
  userIds: string[],
  type: NotificationType,
  payload: Prisma.InputJsonValue,
  email?: NotificationEmail,
): Promise<void> {
  const uniqueIds = Array.from(new Set(userIds));
  if (uniqueIds.length === 0) return;

  await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({ userId, type, payload })),
  });

  if (email) {
    await Promise.all(uniqueIds.map((userId) => sendEmailToUser(userId, email)));
  }
}

/** Admin-composed announcement, broadcast to all employees, one department, or a single employee. */
export async function sendAdminAnnouncement(
  input: SendAdminAnnouncementInput,
  actor: SessionContext,
  meta: RequestMeta = {},
): Promise<{ recipientCount: number }> {
  requirePermission(actor, "employee.manage");

  const where: Prisma.EmployeeWhereInput = { deletedAt: null, status: "ACTIVE" };
  if (input.audience === "DEPARTMENT") where.departmentId = input.departmentId;
  if (input.audience === "EMPLOYEE") where.id = input.employeeId;

  const employees = await prisma.employee.findMany({ where, select: { userId: true } });
  const userIds = employees.map((e) => e.userId);

  await notifyUsers(
    userIds,
    "ADMIN_ANNOUNCEMENT",
    { subject: input.subject, message: input.message },
    input.sendEmail ? { subject: input.subject, text: input.message } : undefined,
  );

  await recordAudit({
    actorUserId: actor.userId,
    action: "notification.admin_announcement_sent",
    targetEntity: "notification",
    targetId: actor.userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { audience: input.audience, departmentId: input.departmentId, employeeId: input.employeeId, subject: input.subject, recipientCount: userIds.length },
  });

  return { recipientCount: userIds.length };
}

export async function listMyNotifications(actor: SessionContext) {
  return prisma.notification.findMany({
    where: { userId: actor.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getUnreadCount(actor: SessionContext): Promise<number> {
  return prisma.notification.count({ where: { userId: actor.userId, readAt: null } });
}

export async function markAsRead(notificationId: string, actor: SessionContext): Promise<void> {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.userId !== actor.userId) {
    throw new NotFoundError("Notification not found");
  }
  await prisma.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });
}

export async function markAllAsRead(actor: SessionContext): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId: actor.userId, readAt: null },
    data: { readAt: new Date() },
  });
}
