import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { signSessionToken, verifySessionToken } from "@/lib/jwt";
import type { SessionContext } from "@/types/session";
import type { PermissionKey, RoleName } from "@/types/permissions";

export class UnauthorizedError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

interface CreateSessionInput {
  userId: string;
  ip: string | null;
  userAgent: string | null;
}

export async function createSession({ userId, ip, userAgent }: CreateSessionInput): Promise<void> {
  const sessionId = randomUUID();
  const ttlSeconds = env.SESSION_TTL_HOURS * 3600;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { mustChangePassword: true, role: { select: { name: true } } },
  });

  await prisma.session.create({
    data: { id: sessionId, userId, ip, userAgent, expiresAt },
  });

  const token = await signSessionToken(
    { sub: userId, jti: sessionId, role: user.role.name, mustChangePassword: user.mustChangePassword },
    ttlSeconds,
  );

  const cookieStore = await cookies();
  cookieStore.set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ttlSeconds,
  });
}

export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;

  if (token) {
    const payload = await verifySessionToken(token);
    if (payload) {
      await prisma.session
        .update({ where: { id: payload.jti }, data: { revokedAt: new Date() } })
        .catch(() => undefined);
    }
  }

  cookieStore.delete(env.SESSION_COOKIE_NAME);
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeOtherSessionsForUser(userId: string, exceptSessionId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null, NOT: { id: exceptSessionId } },
    data: { revokedAt: new Date() },
  });
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { id: payload.jti },
    select: {
      id: true,
      revokedAt: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          employeeCode: true,
          mustChangePassword: true,
          status: true,
          roleId: true,
          role: {
            select: {
              name: true,
              permissions: { select: { permission: { select: { key: true } } } },
            },
          },
          employee: { select: { id: true } },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (session.user.status !== "ACTIVE") return null;

  return {
    sessionId: session.id,
    userId: session.user.id,
    employeeId: session.user.employee?.id ?? null,
    employeeCode: session.user.employeeCode,
    roleId: session.user.roleId,
    roleName: session.user.role.name as RoleName,
    permissions: session.user.role.permissions.map((rp) => rp.permission.key) as PermissionKey[],
    mustChangePassword: session.user.mustChangePassword,
  };
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSessionContext();
  if (!session) throw new UnauthorizedError();
  return session;
}
