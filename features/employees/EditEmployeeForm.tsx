"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { updateEmployeeAction, type UpdateEmployeeFormState } from "@/actions/employee.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Option {
  id: string;
  name: string;
}

interface DesignationOption extends Option {
  departmentId: string;
}

const initialState: UpdateEmployeeFormState = {};

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const SALARY_TYPES = ["MONTHLY", "HOURLY", "ANNUAL"] as const;

function toDateInputValue(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

export function EditEmployeeForm({
  employee,
  departments,
  designations,
  shifts,
  roles,
}: {
  employee: {
    id: string;
    fullName: string;
    phone: string | null;
    address: string | null;
    departmentId: string | null;
    designationId: string | null;
    shiftId: string | null;
    joiningDate: Date | string;
    salary?: unknown;
    salaryType: string | null;
    allowances?: unknown;
    deductions?: unknown;
    emergencyContact: string | null;
    dateOfBirth: Date | string | null;
    user: { roleId: string };
  };
  departments: Option[];
  designations: DesignationOption[];
  shifts: Option[];
  roles: Option[];
}) {
  const updateWithId = updateEmployeeAction.bind(null, employee.id);
  const [state, formAction, pending] = useActionState(updateWithId, initialState);
  const [departmentId, setDepartmentId] = useState(employee.departmentId ?? "");

  const filteredDesignations = useMemo(
    () => designations.filter((d) => d.departmentId === departmentId),
    [designations, departmentId],
  );

  // If the employee's current designation no longer belongs to the selected
  // department (department changed), don't pre-select a stale option.
  const designationDefault = filteredDesignations.some((d) => d.id === employee.designationId)
    ? employee.designationId!
    : "";

  return (
    <form action={formAction} className="grid max-w-xl gap-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" defaultValue={employee.fullName} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={employee.phone ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="joiningDate">Joining Date</Label>
          <Input id="joiningDate" name="joiningDate" type="date" defaultValue={toDateInputValue(employee.joiningDate)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={employee.dateOfBirth ? toDateInputValue(employee.dateOfBirth) : ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={employee.address ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="departmentId">Department</Label>
          <select
            id="departmentId"
            name="departmentId"
            className={selectClass}
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">None</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="designationId">Designation</Label>
          <select
            key={departmentId}
            id="designationId"
            name="designationId"
            className={selectClass}
            disabled={!departmentId}
            defaultValue={designationDefault}
          >
            <option value="">{departmentId ? "None" : "Select a department first"}</option>
            {filteredDesignations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="shiftId">Shift</Label>
          <select id="shiftId" name="shiftId" defaultValue={employee.shiftId ?? ""} className={selectClass}>
            <option value="">None</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="roleId">Role</Label>
          <select id="roleId" name="roleId" defaultValue={employee.user.roleId} className={selectClass}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="salary">Monthly Salary</Label>
          <Input
            id="salary"
            name="salary"
            type="number"
            min="0"
            step="0.01"
            defaultValue={employee.salary != null ? String(employee.salary) : ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="allowances">Allowances</Label>
          <Input
            id="allowances"
            name="allowances"
            type="number"
            min="0"
            step="0.01"
            defaultValue={employee.allowances != null ? String(employee.allowances) : ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deductions">Deductions</Label>
          <Input
            id="deductions"
            name="deductions"
            type="number"
            min="0"
            step="0.01"
            defaultValue={employee.deductions != null ? String(employee.deductions) : ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="salaryType">Salary Type</Label>
        <select id="salaryType" name="salaryType" defaultValue={employee.salaryType ?? ""} className={selectClass}>
          <option value="">None</option>
          {SALARY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emergencyContact">Emergency contact</Label>
        <Input id="emergencyContact" name="emergencyContact" defaultValue={employee.emergencyContact ?? ""} />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
