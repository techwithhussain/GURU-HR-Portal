import { notFound } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import { getAllTickets } from "@/services/ticketService";
import { AdminTicketsPanel } from "@/features/tickets/AdminTicketsPanel";

export default async function AdminTicketsPage() {
  const session = await getSessionContext();
  if (!session || !hasPermission(session, "reports.view.all")) notFound();
  const tickets = await getAllTickets();
  return (
    <div className="mx-auto max-w-3xl">
      <AdminTicketsPanel initial={tickets} />
    </div>
  );
}
