import { notFound } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import { getMySalarySlips } from "@/services/salarySlipService";
import { EmployeeSalarySlipsPanel } from "@/features/salarySlips/EmployeeSalarySlipsPanel";

export const metadata = { title: "My Salary Slips" };

export default async function MySalarySlipsPage() {
  const session = await getSessionContext();
  if (!session || !hasPermission(session, "salary.view")) notFound();

  const slips = await getMySalarySlips(session);

  return (
    <div className="mx-auto max-w-5xl w-full">
      <EmployeeSalarySlipsPanel slips={slips} />
    </div>
  );
}
