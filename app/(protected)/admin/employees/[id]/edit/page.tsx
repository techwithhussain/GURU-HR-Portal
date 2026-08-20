import { notFound } from "next/navigation";
import { getEmployeeAction } from "@/actions/employee.actions";
import { listDepartments, listDesignations, listRoles } from "@/services/orgService";
import { listShifts } from "@/services/shiftService";
import { getSessionContext } from "@/services/sessionService";
import { EditEmployeeForm } from "@/features/employees/EditEmployeeForm";
import { AccountActionsCard } from "@/features/employees/AccountActionsCard";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionContext();
  if (!session || session.roleName !== "ADMIN") notFound();

  const { id } = await params;

  const [employee, departments, designations, shifts, roles] = await Promise.all([
    getEmployeeAction(id),
    listDepartments(),
    listDesignations(),
    listShifts(),
    listRoles(),
  ]);

  const isLocked = !!employee.user.lockedUntil && new Date(employee.user.lockedUntil) > new Date();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit Employee</h1>
      <EditEmployeeForm
        employee={{
          ...employee,
          salary: employee.salary != null ? Number(employee.salary) : null,
          allowances: employee.allowances != null ? Number(employee.allowances) : null,
          deductions: employee.deductions != null ? Number(employee.deductions) : null,
        }}
        departments={departments}
        designations={designations}
        shifts={shifts}
        roles={roles}
      />
      <AccountActionsCard
        employeeId={employee.id}
        userId={employee.userId}
        status={employee.status}
        isLocked={isLocked}
      />
    </div>
  );
}
