import type { PermissionKey } from "@/types/permissions";
import type { SessionContext } from "@/types/session";

export class ForbiddenError extends Error {
  constructor(permission: PermissionKey) {
    super(`Missing required permission: ${permission}`);
    this.name = "ForbiddenError";
  }
}

export function hasPermission(session: SessionContext, permission: PermissionKey): boolean {
  return session.permissions.includes(permission);
}

export function requirePermission(session: SessionContext, permission: PermissionKey): void {
  if (!hasPermission(session, permission)) {
    throw new ForbiddenError(permission);
  }
}
