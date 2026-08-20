import { notFound } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import { getSalarySlipById } from "@/services/salarySlipService";
import { AdminSlipDetailClient } from "./AdminSlipDetailClient";

export const metadata = { title: "View Salary Slip" };

export default async function AdminSlipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!session || !hasPermission(session, "salary.manage")) notFound();

  const slip = await getSalarySlipById(id, session);
  if (!slip) notFound();

  return (
    <div className="mx-auto max-w-5xl w-full">
      <AdminSlipDetailClient slip={slip} />
    </div>
  );
}
