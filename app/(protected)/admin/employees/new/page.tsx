import { redirect } from "next/navigation";
import { listDepartments, listDesignations, listRoles } from "@/services/orgService";
import { listShifts } from "@/services/shiftService";
import { getSessionContext } from "@/services/sessionService";
import { CreateEmployeeForm } from "@/features/employees/CreateEmployeeForm";

export default async function NewEmployeePage() {
  const session = await getSessionContext();
  if (!session || session.roleName !== "ADMIN") redirect("/dashboard");

  const [departments, designations, shifts, roles] = await Promise.all([
    listDepartments(),
    listDesignations(),
    listShifts(),
    listRoles(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Add Employee</h1>
      <CreateEmployeeForm
        departments={departments}
        designations={designations}
        shifts={shifts}
        roles={roles}
      />
    </div>
  );
}
