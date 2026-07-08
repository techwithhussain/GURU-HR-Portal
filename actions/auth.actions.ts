"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import * as authService from "@/services/authService";
import { requireSession } from "@/services/sessionService";
import { getClientIp } from "@/lib/network/getClientIp";

const loginSchema = z.object({
  employeeCode: z.string().min(1, "Employee ID is required"),
  password: z.string().min(1, "Password is required"),
});

export interface LoginFormState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    employeeCode: formData.get("employeeCode"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Please enter your employee ID and password." };
  }

  const hdrs = await headers();
  const result = await authService.login({
    ...parsed.data,
    ip: getClientIp(hdrs),
    userAgent: hdrs.get("user-agent"),
  });

  if (!result.ok) {
    if (result.error === "ACCOUNT_LOCKED") {
      return { error: `Account temporarily locked. Try again in ${result.retryAfterMinutes} minute(s).` };
    }
    return { error: "Invalid credentials." };
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await authService.logout();
  redirect("/login");
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

export interface ChangePasswordFormState {
  error?: string;
}

export async function changePasswordAction(
  _prevState: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { error: "Please fill in both password fields." };

  const session = await requireSession();
  const result = await authService.changePassword({
    userId: session.userId,
    currentSessionId: session.sessionId,
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
  });

  if (!result.ok) return { error: result.error };

  redirect("/dashboard");
}

const forgotPasswordSchema = z.object({ identifier: z.string().min(1) });

export interface ForgotPasswordFormState {
  submitted?: boolean;
}

export async function forgotPasswordAction(
  _prevState: ForgotPasswordFormState,
  formData: FormData,
): Promise<ForgotPasswordFormState> {
  const parsed = forgotPasswordSchema.safeParse({ identifier: formData.get("identifier") });
  if (parsed.success) {
    await authService.requestPasswordReset(parsed.data.identifier);
  }
  // Always report success regardless of whether the account exists (no enumeration).
  return { submitted: true };
}

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(1),
});

export interface ResetPasswordFormState {
  error?: string;
}

export async function resetPasswordAction(
  _prevState: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { error: "Invalid request." };

  const result = await authService.resetPassword(parsed.data.token, parsed.data.newPassword);
  if (!result.ok) return { error: result.error };

  redirect("/login");
}
