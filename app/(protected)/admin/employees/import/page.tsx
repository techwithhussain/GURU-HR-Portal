import { notFound } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { ImportEmployeesForm } from "@/features/employees/ImportEmployeesForm";

export default async function ImportEmployeesPage() {
  const session = await getSessionContext();
  if (!session || session.roleName !== "ADMIN") notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Bulk Import Employees</h1>
      <ImportEmployeesForm />
    </div>
  );
}
