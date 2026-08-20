import { notFound } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import { getEmployeesForSlipDropdown } from "@/services/salarySlipService";
import { CreateSalarySlipForm } from "@/features/salarySlips/CreateSalarySlipForm";

export const metadata = { title: "Generate Salary Slip" };

export default async function NewSalarySlipPage() {
  const session = await getSessionContext();
  if (!session || !hasPermission(session, "salary.manage")) notFound();

  const employees = await getEmployeesForSlipDropdown(session);

  return (
    <div className="mx-auto max-w-3xl w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Generate Salary Slip</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Create a monthly salary slip for an employee
        </p>
      </div>
      <CreateSalarySlipForm employees={employees} />
    </div>
  );
}
