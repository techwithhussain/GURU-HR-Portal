"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { createEmployeeAction, type CreateEmployeeFormState } from "@/actions/employee.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoUpload } from "@/features/employees/PhotoUpload";

interface Option {
  id: string;
  name: string;
}

interface DesignationOption extends Option {
  departmentId: string;
}

const initialState: CreateEmployeeFormState = {};

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function CreateEmployeeForm({
  departments,
  designations,
  shifts,
  roles,
}: {
  departments: Option[];
  designations: DesignationOption[];
  shifts: Option[];
  roles: Option[];
}) {
  const [state, formAction, pending] = useActionState(createEmployeeAction, initialState);
  const [departmentId, setDepartmentId] = useState("");

  const filteredDesignations = useMemo(
    () => designations.filter((d) => d.departmentId === departmentId),
    [designations, departmentId],
  );

  if (state.tempPassword) {
    return (
      <div className="max-w-xl space-y-4 rounded-lg border border-border/50 bg-muted/40 p-4">
        <p className="text-sm">
          Employee <strong>{state.employeeCode}</strong> created. Share this temporary password —
          they&apos;ll be required to change it on first login:
        </p>
        <p className="rounded bg-background px-3 py-2 font-mono text-sm">{state.tempPassword}</p>
        <Button asChild variant="outline" size="sm">
          <a href="/admin/employees">Back to employees</a>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid max-w-xl gap-4">
      <PhotoUpload />

      <div className="space-y-2">
        <Label htmlFor="employeeCode">Employee ID</Label>
        <Input id="employeeCode" name="employeeCode" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="roleId">Role</Label>
        <select id="roleId" name="roleId" required className={selectClass}>
          <option value="">Select a role</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
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
            defaultValue=""
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
          <select id="shiftId" name="shiftId" className={selectClass}>
            <option value="">None</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="joiningDate">Joining date</Label>
          <Input id="joiningDate" name="joiningDate" type="date" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="salary">Salary (optional)</Label>
        <Input id="salary" name="salary" type="number" min="0" step="0.01" />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Creating..." : "Create employee"}
      </Button>
    </form>
  );
}
