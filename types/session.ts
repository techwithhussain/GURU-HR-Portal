import type { PermissionKey, RoleName } from "@/types/permissions";

export interface SessionContext {
  sessionId: string;
  userId: string;
  employeeId: string | null;
  employeeCode: string;
  roleId: string;
  roleName: RoleName;
  permissions: PermissionKey[];
  mustChangePassword: boolean;
}
