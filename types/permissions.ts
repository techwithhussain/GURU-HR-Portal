export const PERMISSION_KEYS = [
  "employee.manage",
  "employee.delete",
  "leave.approve",
  "leave.apply",
  "attendance.self",
  "attendance.correct",
  "reports.view.all",
  "reports.view.self",
  "salary.view",
  "settings.manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const ROLE_NAMES = ["ADMIN", "EMPLOYEE"] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

export const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  ADMIN: [...PERMISSION_KEYS],
  EMPLOYEE: ["leave.apply", "attendance.self", "reports.view.self"],
};
