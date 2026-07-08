import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/jwt";

export interface ProxySessionInfo {
  userId: string;
  roleName: string;
  mustChangePassword: boolean;
}

/**
 * Authoritative, DB-backed session check run on every protected request —
 * catches revocation/expiry/deactivation instantly, not just at login.
 */
export async function validateSessionCookie(token: string | undefined): Promise<ProxySessionInfo | null> {
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { id: payload.jti },
    select: {
      revokedAt: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          status: true,
          mustChangePassword: true,
          role: { select: { name: true } },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (session.user.status !== "ACTIVE") return null;

  return {
    userId: session.user.id,
    roleName: session.user.role.name,
    mustChangePassword: session.user.mustChangePassword,
  };
}
