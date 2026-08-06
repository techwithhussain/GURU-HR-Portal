"use server";

import { requireSession } from "@/services/sessionService";
import * as ticketService from "@/services/ticketService";
import type { TicketPriority, TicketStatus } from "@/types/ticket";
import { revalidatePath } from "next/cache";

export async function getMyTicketsAction() {
  const session = await requireSession();
  return ticketService.getMyTickets(session);
}

export async function getAllTicketsAction() {
  const session = await requireSession();
  return ticketService.getAllTickets();
}

export async function createTicketAction(data: {
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
}) {
  const session = await requireSession();
  await ticketService.createTicket(session, data);
  revalidatePath("/ticket");
}

export async function replyTicketAction(id: string, reply: string, status: TicketStatus) {
  const session = await requireSession();
  await ticketService.replyTicket(session, id, reply, status);
  revalidatePath("/admin/tickets");
  revalidatePath("/ticket");
}
