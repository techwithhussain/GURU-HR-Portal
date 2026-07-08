"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as employeeService from "@/services/employeeService";
import { requireSession } from "@/services/sessionService";
import { getClientIp } from "@/lib/network/getClientIp";
import {
  createEmployeeSchema,
  employeeSearchSchema,
  updateEmployeeSchema,
} from "@/lib/validation/employee";

async function requestMeta() {
  const hdrs = await headers();
  return { ip: getClientIp(hdrs), userAgent: hdrs.get("user-agent") };
}

/** FormData always submits a string for every field; treat blanks as "not provided". */
function formDataToRecord(formData: FormData): Record<string, unknown> {
  const record = Object.fromEntries(formData.entries());
  for (const key of Object.keys(record)) {
    if (record[key] === "") delete record[key];
  }
  return record;
}

export interface CreateEmployeeFormState {
  error?: string;
  tempPassword?: string;
  employeeCode?: string;
}

export async function createEmployeeAction(
  _prevState: CreateEmployeeFormState,
  formData: FormData,
): Promise<CreateEmployeeFormState> {
  const parsed = createEmployeeSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    const { tempPassword } = await employeeService.createEmployee(parsed.data, session, meta);
    revalidatePath("/admin/employees");
    return { tempPassword, employeeCode: parsed.data.employeeCode };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create employee" };
  }
}

export interface UpdateEmployeeFormState {
  error?: string;
}

export async function updateEmployeeAction(
  employeeId: string,
  _prevState: UpdateEmployeeFormState,
  formData: FormData,
): Promise<UpdateEmployeeFormState> {
  const parsed = updateEmployeeSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await employeeService.updateEmployee(employeeId, parsed.data, session, meta);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update employee" };
  }

  revalidatePath("/admin/employees");
  redirect("/admin/employees");
}

export async function deactivateEmployeeAction(employeeId: string): Promise<void> {
  const session = await requireSession();
  const meta = await requestMeta();
  await employeeService.deactivateEmployee(employeeId, session, meta);
  revalidatePath("/admin/employees");
}

export async function activateEmployeeAction(employeeId: string): Promise<void> {
  const session = await requireSession();
  const meta = await requestMeta();
  await employeeService.activateEmployee(employeeId, session, meta);
  revalidatePath("/admin/employees");
}

export async function deleteEmployeeAction(employeeId: string): Promise<void> {
  const session = await requireSession();
  const meta = await requestMeta();
  await employeeService.deleteEmployee(employeeId, session, meta);
  revalidatePath("/admin/employees");
}

export async function searchEmployeesAction(input: unknown) {
  const parsed = employeeSearchSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");

  const session = await requireSession();
  return employeeService.searchEmployees(parsed.data, session);
}

export async function getEmployeeAction(employeeId: string) {
  const session = await requireSession();
  return employeeService.getEmployeeById(employeeId, session);
}
