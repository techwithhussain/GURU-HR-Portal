import "server-only";
import { prisma } from "@/lib/prisma";
import type { SessionContext } from "@/types/session";
import type { TicketStatus, TicketPriority, TicketItem } from "@/types/ticket";

export type { TicketStatus, TicketPriority, TicketItem };
export { TICKET_CATEGORIES } from "@/types/ticket";

/** Get tickets raised by the logged-in employee */
export async function getMyTickets(session: SessionContext): Promise<TicketItem[]> {
  if (!session.employeeId) return [];
  const rows = await prisma.ticket.findMany({
    where: { employeeId: session.employeeId },
    orderBy: { createdAt: "desc" },
    include: {
      employee: {
        select: {
          fullName: true,
          user: { select: { employeeCode: true } },
          department: { select: { name: true } },
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    status: r.status as TicketStatus,
    priority: r.priority as TicketPriority,
    adminReply: r.adminReply,
    resolvedAt: r.resolvedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    employeeName: r.employee.fullName,
    employeeCode: r.employee.user.employeeCode,
    departmentName: r.employee.department?.name ?? null,
  }));
}

/** Get all tickets — admin only */
export async function getAllTickets(): Promise<TicketItem[]> {
  const rows = await prisma.ticket.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      employee: {
        select: {
          fullName: true,
          user: { select: { employeeCode: true } },
          department: { select: { name: true } },
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    status: r.status as TicketStatus,
    priority: r.priority as TicketPriority,
    adminReply: r.adminReply,
    resolvedAt: r.resolvedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    employeeName: r.employee.fullName,
    employeeCode: r.employee.user.employeeCode,
    departmentName: r.employee.department?.name ?? null,
  }));
}

/** Raise a new ticket */
export async function createTicket(
  session: SessionContext,
  data: { title: string; description: string; category: string; priority: TicketPriority },
): Promise<void> {
  if (!session.employeeId) throw new Error("Not an employee");
  await prisma.ticket.create({
    data: {
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      employeeId: session.employeeId,
    },
  });
}

/** Admin: reply to a ticket and update status */
export async function replyTicket(
  session: SessionContext,
  id: string,
  reply: string,
  status: TicketStatus,
): Promise<void> {
  if (session.roleName !== "ADMIN") throw new Error("Forbidden");
  await prisma.ticket.update({
    where: { id },
    data: {
      adminReply: reply,
      status,
      resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null,
    },
  });
}
