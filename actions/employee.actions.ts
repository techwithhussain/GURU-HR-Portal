"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as employeeService from "@/services/employeeService";
import * as authService from "@/services/authService";
import { requireSession } from "@/services/sessionService";
import { toUserMessage } from "@/lib/errors/toUserMessage";
import { getClientIp } from "@/lib/network/getClientIp";
import {
  bulkAssignShiftSchema,
  bulkEmployeeIdsSchema,
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
    return { error: toUserMessage(err, "Failed to create employee") };
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
    return { error: toUserMessage(err, "Failed to update employee") };
  }

  revalidatePath("/admin/employees");
  redirect("/admin/employees");
}

export async function deactivateEmployeeAction(employeeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await employeeService.deactivateEmployee(employeeId, session, meta);
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to deactivate employee") };
  }
}

export async function activateEmployeeAction(employeeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await employeeService.activateEmployee(employeeId, session, meta);
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to activate employee") };
  }
}

export async function deleteEmployeeAction(employeeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await employeeService.deleteEmployee(employeeId, session, meta);
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to delete employee") };
  }
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

export interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function resignEmployeeAction(employeeId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await employeeService.setEmployeeStatus(employeeId, "RESIGNED", session, meta);
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to mark employee resigned") };
  }
}

export async function getEmployeeManagementStatsAction() {
  const session = await requireSession();
  return employeeService.getEmployeeManagementStats(session);
}

export async function getEmployeeProfileAction(employeeId: string) {
  const session = await requireSession();
  return employeeService.getEmployeeProfile(employeeId, session);
}

export async function bulkActivateEmployeesAction(input: unknown): Promise<ActionResult<employeeService.BulkResult>> {
  const parsed = bulkEmployeeIdsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  const meta = await requestMeta();
  const result = await employeeService.bulkActivateEmployees(parsed.data.employeeIds, session, meta);
  revalidatePath("/admin/employees");
  return { success: true, data: result };
}

export async function bulkSetStatusAction(
  input: unknown,
  status: "INACTIVE" | "RESIGNED",
): Promise<ActionResult<employeeService.BulkResult>> {
  const parsed = bulkEmployeeIdsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  const meta = await requestMeta();
  const result = await employeeService.bulkSetStatus(parsed.data.employeeIds, status, session, meta);
  revalidatePath("/admin/employees");
  return { success: true, data: result };
}

export async function bulkDeleteEmployeesAction(input: unknown): Promise<ActionResult<employeeService.BulkResult>> {
  const parsed = bulkEmployeeIdsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  const meta = await requestMeta();
  const result = await employeeService.bulkDeleteEmployees(parsed.data.employeeIds, session, meta);
  revalidatePath("/admin/employees");
  return { success: true, data: result };
}

export async function bulkAssignShiftAction(input: unknown): Promise<ActionResult<employeeService.BulkResult>> {
  const parsed = bulkAssignShiftSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  const meta = await requestMeta();
  const result = await employeeService.bulkAssignShift(
    parsed.data.employeeIds,
    parsed.data.shiftId,
    session,
    meta,
  );
  revalidatePath("/admin/employees");
  return { success: true, data: result };
}

export async function adminResetPasswordAction(targetUserId: string): Promise<ActionResult<{ tempPassword: string }>> {
  try {
    const session = await requireSession();
    const meta = await requestMeta();
    const result = await authService.adminResetPassword(targetUserId, session, meta);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to reset password") };
  }
}

export async function lockAccountAction(targetUserId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await authService.lockAccount(targetUserId, session, meta);
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to lock account") };
  }
}

export async function unlockAccountAction(targetUserId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await authService.unlockAccount(targetUserId, session, meta);
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to unlock account") };
  }
}
