import { redirect } from "next/navigation";
import { getEmployeeAction } from "@/actions/employee.actions";
import { listDepartments, listDesignations } from "@/services/orgService";
import { listShifts } from "@/services/shiftService";
import { getSessionContext } from "@/services/sessionService";
import { EditEmployeeForm } from "@/features/employees/EditEmployeeForm";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionContext();
  if (!session || session.roleName !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const [employee, departments, designations, shifts] = await Promise.all([
    getEmployeeAction(id),
    listDepartments(),
    listDesignations(),
    listShifts(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit Employee</h1>
      <EditEmployeeForm
        employee={employee}
        departments={departments}
        designations={designations}
        shifts={shifts}
      />
    </div>
  );
}
