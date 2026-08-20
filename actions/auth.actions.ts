"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import * as authService from "@/services/authService";
import { requireSession } from "@/services/sessionService";
import { getClientIp } from "@/lib/network/getClientIp";
import { checkRateLimit } from "@/lib/rateLimit";

const LOGIN_RATE_LIMIT = { max: 20, windowMs: 10 * 60_000 }; // 20 attempts / 10 min per IP
const FORGOT_PASSWORD_RATE_LIMIT = { max: 5, windowMs: 60 * 60_000 }; // 5 requests / hour per IP

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
  const ip = getClientIp(hdrs);

  if (!checkRateLimit(`login:${ip ?? "unknown"}`, LOGIN_RATE_LIMIT.max, LOGIN_RATE_LIMIT.windowMs)) {
    return { error: "Too many login attempts from this network. Please try again in a few minutes." };
  }

  // pcName comes from the hidden form field — populated by agent's local server (port 47800)
  const pcName = (formData.get("pcName") as string | null) || null;

  const result = await authService.login({
    ...parsed.data,
    ip,
    userAgent: hdrs.get("user-agent"),
    pcName,
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
  const hdrs = await headers();
  const ip = getClientIp(hdrs);

  if (
    parsed.success &&
    checkRateLimit(`forgot-password:${ip ?? "unknown"}`, FORGOT_PASSWORD_RATE_LIMIT.max, FORGOT_PASSWORD_RATE_LIMIT.windowMs)
  ) {
    await authService.requestPasswordReset(parsed.data.identifier);
  }
  // Always report success regardless of whether the account exists or the
  // request was rate-limited (no enumeration, no signal to an attacker).
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
