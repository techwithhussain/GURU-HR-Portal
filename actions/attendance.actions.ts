"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as attendanceService from "@/services/attendanceService";
import { requireSession } from "@/services/sessionService";
import { toUserMessage } from "@/lib/errors/toUserMessage";
import { getClientIp } from "@/lib/network/getClientIp";
import { correctAttendanceSchema, startBreakSchema } from "@/lib/validation/attendance";
import { updateAttendanceNotesSchema } from "@/lib/validation/report";

async function requestMeta() {
  const hdrs = await headers();
  return { ip: getClientIp(hdrs), userAgent: hdrs.get("user-agent") };
}

export interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

function requireEmployeeId(session: { employeeId: string | null }): string {
  if (!session.employeeId) throw new Error("No employee profile linked to this account");
  return session.employeeId;
}

export async function checkInAction(): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const employeeId = requireEmployeeId(session);
    const meta = await requestMeta();
    await attendanceService.checkIn(employeeId, session, meta);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Login failed") };
  }
}

export async function checkOutAction(): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const employeeId = requireEmployeeId(session);
    const meta = await requestMeta();
    await attendanceService.checkOut(employeeId, session, meta);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Logout failed") };
  }
}

export async function startBreakAction(input: unknown): Promise<ActionResult> {
  const parsed = startBreakSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid break type" };

  try {
    const session = await requireSession();
    const employeeId = requireEmployeeId(session);
    const meta = await requestMeta();
    await attendanceService.startBreak(employeeId, parsed.data.type, session, meta);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to start break") };
  }
}

export async function endBreakAction(): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const employeeId = requireEmployeeId(session);
    const meta = await requestMeta();
    await attendanceService.endBreak(employeeId, session, meta);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to end break") };
  }
}

export async function correctAttendanceAction(
  attendanceId: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = correctAttendanceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await attendanceService.correctAttendance(attendanceId, parsed.data, session, meta);
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to correct attendance") };
  }
}

export async function updateAttendanceNotesAction(
  attendanceId: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = updateAttendanceNotesSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const session = await requireSession();
    const meta = await requestMeta();
    await attendanceService.updateAttendanceAdminNotes(attendanceId, parsed.data.notes, session, meta);
    revalidatePath(`/reports/attendance/${attendanceId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to save notes") };
  }
}

export async function getAttendanceStatusAction() {
  const session = await requireSession();
  const employeeId = requireEmployeeId(session);
  return attendanceService.getCurrentStatus(employeeId);
}

export async function deleteBreakAction(breakId: string, attendanceId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await attendanceService.deleteBreak(breakId, session);
    revalidatePath(`/reports/attendance/${attendanceId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "Failed to delete break") };
  }
}

