import { notFound } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { getMyTickets } from "@/services/ticketService";
import { MyTicketsPanel } from "@/features/tickets/MyTicketsPanel";

export default async function TicketPage() {
  const session = await getSessionContext();
  if (!session || !session.employeeId) notFound();
  const tickets = await getMyTickets(session);
  return (
    <div className="mx-auto max-w-3xl">
      <MyTicketsPanel initial={tickets} />
    </div>
  );
}
