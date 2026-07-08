import type { Prisma } from "@/lib/generated/prisma/client";
import type { SessionContext } from "@/types/session";
import { hasPermission } from "@/lib/rbac/permissions";

/**
 * Returns the Prisma `select` for reading employees, scoped to what the
 * requesting session is allowed to see. Salary is omitted at the query layer
 * (not just hidden in the UI) for anyone without `salary.view` — the field is
 * never fetched into memory for unauthorized roles.
 */
export function employeeSelect(session: SessionContext): Prisma.EmployeeSelect {
  const canViewSalary = hasPermission(session, "salary.view");

  return {
    id: true,
    userId: true,
    fullName: true,
    phone: true,
    departmentId: true,
    designationId: true,
    shiftId: true,
    managerId: true,
    joiningDate: true,
    salary: canViewSalary,
    emergencyContact: true,
    documents: true,
    status: true,
    profileImageUrl: true,
    createdAt: true,
    updatedAt: true,
  };
}
