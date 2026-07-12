import "server-only";
import { createHash, randomBytes } from "crypto";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { generateTempPassword, hashPassword, validatePasswordPolicy, verifyPassword } from "@/lib/password";
import { requirePermission } from "@/lib/rbac/permissions";
import {
  createSession,
  getSessionContext,
  revokeAllSessionsForUser,
  revokeCurrentSession,
  revokeOtherSessionsForUser,
} from "@/services/sessionService";
import { recordAudit } from "@/services/auditService";
import { sendMail } from "@/lib/mailer";
import { notifyUser, notifyUsers } from "@/services/notificationService";
import { NotFoundError, type RequestMeta } from "@/services/employeeService";
import type { SessionContext } from "@/types/session";

// A locked-forever sentinel for admin-initiated locks — far enough in the
// future to never expire on its own (self-service lockouts use a short,
// auto-expiring `lockedUntil`; this distinguishes an explicit admin lock).
const ADMIN_LOCK_SENTINEL = new Date("2099-01-01T00:00:00.000Z");

export interface LoginInput {
  employeeCode: string;
  password: string;
  ip: string | null;
  userAgent: string | null;
}

export type LoginResult =
  | { ok: true }
  | { ok: false; error: "INVALID_CREDENTIALS" }
  | { ok: false; error: "ACCOUNT_LOCKED"; retryAfterMinutes: number };

const INVALID_CREDENTIALS: LoginResult = { ok: false, error: "INVALID_CREDENTIALS" };

export async function login(input: LoginInput): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { employeeCode: input.employeeCode },
    select: {
      id: true,
      passwordHash: true,
      status: true,
      failedLoginAttempts: true,
      lastFailedLoginAt: true,
      lockedUntil: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    await recordAudit({
      action: "auth.login.failed",
      targetEntity: "user",
      targetId: user?.id ?? null,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: { employeeCode: input.employeeCode, reason: "not_found_or_inactive" },
    });
    return INVALID_CREDENTIALS;
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    const retryAfterMinutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
    await recordAudit({
      actorUserId: user.id,
      action: "auth.login.blocked_locked",
      targetEntity: "user",
      targetId: user.id,
      ip: input.ip,
      userAgent: input.userAgent,
    });
    return { ok: false, error: "ACCOUNT_LOCKED", retryAfterMinutes };
  }

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) {
    await recordFailedAttempt(user, input, now);
    return INVALID_CREDENTIALS;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lastFailedLoginAt: null, lockedUntil: null, lastLoginAt: now },
  });

  await createSession({ userId: user.id, ip: input.ip, userAgent: input.userAgent });
  await recordAudit({
    actorUserId: user.id,
    action: "auth.login.success",
    targetEntity: "user",
    targetId: user.id,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return { ok: true };
}

async function recordFailedAttempt(
  user: { id: string },
  input: LoginInput,
  now: Date,
): Promise<void> {
  const windowMs = env.ACCOUNT_LOCKOUT_WINDOW_MINUTES * 60_000;

  // Re-read and update the counter inside one Serializable transaction so two
  // concurrent failed attempts for the same account can't both read the same
  // base count and under-count toward the lockout threshold.
  const { nextAttempts, willLock } = await prisma.$transaction(
    async (tx) => {
      const fresh = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { failedLoginAttempts: true, lastFailedLoginAt: true },
      });

      const withinWindow = fresh.lastFailedLoginAt
        ? now.getTime() - fresh.lastFailedLoginAt.getTime() <= windowMs
        : false;
      const nextAttempts = withinWindow ? fresh.failedLoginAttempts + 1 : 1;
      const willLock = nextAttempts >= env.ACCOUNT_LOCKOUT_MAX_ATTEMPTS;

      await tx.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: nextAttempts,
          lastFailedLoginAt: now,
          lockedUntil: willLock
            ? new Date(now.getTime() + env.ACCOUNT_LOCKOUT_DURATION_MINUTES * 60_000)
            : undefined,
        },
      });

      return { nextAttempts, willLock };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  await recordAudit({
    actorUserId: user.id,
    action: willLock ? "auth.login.lockout_triggered" : "auth.login.failed",
    targetEntity: "user",
    targetId: user.id,
    ip: input.ip,
    userAgent: input.userAgent,
    metadata: { attempts: nextAttempts },
  });

  if (willLock) {
    const admins = await prisma.user.findMany({
      where: { role: { name: "ADMIN" }, status: "ACTIVE" },
      select: { id: true },
    });
    const payload = { lockedUserId: user.id, attempts: nextAttempts };
    await notifyUser(user.id, "ACCOUNT_LOCKED", payload, {
      subject: "Your GDA EMS account has been locked",
      text: `Your account was locked after ${nextAttempts} failed login attempts. It will unlock automatically after ${env.ACCOUNT_LOCKOUT_DURATION_MINUTES} minutes.`,
    });
    await notifyUsers(
      admins.map((a) => a.id),
      "ACCOUNT_LOCKED",
      payload,
    );
  }
}

export async function logout(): Promise<void> {
  const session = await getSessionContext();
  await revokeCurrentSession();
  if (session) {
    await recordAudit({
      actorUserId: session.userId,
      action: "auth.logout",
      targetEntity: "user",
      targetId: session.userId,
    });
  }
}

export interface ChangePasswordInput {
  userId: string;
  currentSessionId: string;
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { passwordHash: true },
  });

  const currentValid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!currentValid) return { ok: false, error: "CURRENT_PASSWORD_INVALID" };

  const policy = validatePasswordPolicy(input.newPassword);
  if (!policy.valid) return { ok: false, error: policy.reason! };

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id: input.userId },
    data: { passwordHash, mustChangePassword: false },
  });

  await revokeOtherSessionsForUser(input.userId, input.currentSessionId);
  await recordAudit({
    actorUserId: input.userId,
    action: "auth.password.changed",
    targetEntity: "user",
    targetId: input.userId,
  });

  return { ok: true };
}

const RESET_TOKEN_TTL_MS = 30 * 60_000;

export async function requestPasswordReset(
  employeeCodeOrEmail: string,
): Promise<{ resetLink?: string }> {
  const user = await prisma.user.findFirst({
    where: { OR: [{ employeeCode: employeeCodeOrEmail }, { email: employeeCodeOrEmail }] },
    select: { id: true, email: true },
  });

  // Do not reveal whether the account exists.
  if (!user) return {};

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  await recordAudit({
    actorUserId: user.id,
    action: "auth.password_reset.requested",
    targetEntity: "user",
    targetId: user.id,
  });

  const resetLink = `${env.APP_URL}/reset-password/${rawToken}`;
  await sendMail({
    to: user.email,
    subject: "Reset your GDA EMS password",
    text: `Use this link to reset your password (valid for 30 minutes):\n\n${resetLink}`,
  });

  return { resetLink };
}

export async function resetPassword(
  rawToken: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const user = await prisma.user.findFirst({
    where: { passwordResetTokenHash: tokenHash },
    select: { id: true, passwordResetExpiresAt: true },
  });

  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
    return { ok: false, error: "INVALID_OR_EXPIRED_TOKEN" };
  }

  const policy = validatePasswordPolicy(newPassword);
  if (!policy.valid) return { ok: false, error: policy.reason! };

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
      lockedUntil: null,
    },
  });

  await revokeAllSessionsForUser(user.id);
  await recordAudit({
    actorUserId: user.id,
    action: "auth.password_reset.completed",
    targetEntity: "user",
    targetId: user.id,
  });

  return { ok: true };
}

/**
 * Admin-initiated password reset. Reuses the same fields the self-service
 * flow (`resetPassword` above) governs — clears lockout state together with
 * the password, exactly like a self-reset, so an admin reset can't leave an
 * account both password-reset and still locked. Returns the new temporary
 * password once, for the admin UI to display (never persisted in plaintext).
 */
export async function adminResetPassword(
  targetUserId: string,
  actor: SessionContext,
  meta: RequestMeta = {},
): Promise<{ tempPassword: string }> {
  requirePermission(actor, "employee.manage");

  const user = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, email: true } });
  if (!user) throw new NotFoundError("User not found");

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      passwordHash,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
      lockedUntil: null,
    },
  });

  await revokeAllSessionsForUser(targetUserId);
  await recordAudit({
    actorUserId: actor.userId,
    action: "user.password_reset_by_admin",
    targetEntity: "user",
    targetId: targetUserId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  await sendMail({
    to: user.email,
    subject: "Your GDA EMS password has been reset",
    text: `An administrator has reset your password. Your new temporary password is: ${tempPassword}\n\nYou will be asked to change it on your next login.`,
  });

  return { tempPassword };
}

export async function lockAccount(
  targetUserId: string,
  actor: SessionContext,
  meta: RequestMeta = {},
): Promise<void> {
  requirePermission(actor, "employee.manage");

  const user = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!user) throw new NotFoundError("User not found");

  await prisma.user.update({ where: { id: targetUserId }, data: { lockedUntil: ADMIN_LOCK_SENTINEL } });
  await revokeAllSessionsForUser(targetUserId);

  await recordAudit({
    actorUserId: actor.userId,
    action: "user.locked_by_admin",
    targetEntity: "user",
    targetId: targetUserId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}

export async function unlockAccount(
  targetUserId: string,
  actor: SessionContext,
  meta: RequestMeta = {},
): Promise<void> {
  requirePermission(actor, "employee.manage");

  const user = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!user) throw new NotFoundError("User not found");

  await prisma.user.update({
    where: { id: targetUserId },
    data: { lockedUntil: null, failedLoginAttempts: 0 },
  });

  await recordAudit({
    actorUserId: actor.userId,
    action: "user.unlocked_by_admin",
    targetEntity: "user",
    targetId: targetUserId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}
