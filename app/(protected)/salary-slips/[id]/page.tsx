import { notFound } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import { getSalarySlipById } from "@/services/salarySlipService";
import { SalarySlipView } from "@/features/salarySlips/SalarySlipView";

export const metadata = { title: "Salary Slip" };

export default async function EmployeeSlipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!session || !hasPermission(session, "salary.view")) notFound();

  const slip = await getSalarySlipById(id, session);
  if (!slip) notFound();

  return (
    <div className="mx-auto max-w-5xl w-full">
      <SalarySlipView slip={slip} />
    </div>
  );
}
