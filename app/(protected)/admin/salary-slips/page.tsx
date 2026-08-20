import { notFound } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import { getAllSalarySlips } from "@/services/salarySlipService";
import { AdminSalarySlipsPanel } from "@/features/salarySlips/AdminSalarySlipsPanel";

export const metadata = { title: "Salary Slips — Admin" };

export default async function AdminSalarySlipsPage() {
  const session = await getSessionContext();
  if (!session || !hasPermission(session, "salary.manage")) notFound();

  const slips = await getAllSalarySlips(session);

  return (
    <div className="mx-auto max-w-5xl w-full">
      <AdminSalarySlipsPanel initial={slips} />
    </div>
  );
}
