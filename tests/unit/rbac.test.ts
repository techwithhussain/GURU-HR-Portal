import { describe, expect, it } from "vitest";
import { ForbiddenError, hasPermission, requirePermission } from "@/lib/rbac/permissions";
import { employeeSelect } from "@/lib/rbac/fieldVisibility";
import { ROLE_PERMISSIONS } from "@/types/permissions";
import type { SessionContext } from "@/types/session";

function sessionFor(roleName: keyof typeof ROLE_PERMISSIONS): SessionContext {
  return {
    sessionId: "session-1",
    userId: "user-1",
    employeeId: "employee-1",
    employeeCode: "EMP001",
    roleId: "role-1",
    roleName,
    permissions: ROLE_PERMISSIONS[roleName],
    mustChangePassword: false,
  };
}

describe("role x permission matrix", () => {
  it("grants Admin every permission", () => {
    const session = sessionFor("ADMIN");
    expect(hasPermission(session, "employee.delete")).toBe(true);
    expect(hasPermission(session, "salary.view")).toBe(true);
    expect(hasPermission(session, "settings.manage")).toBe(true);
    expect(hasPermission(session, "leave.approve")).toBe(true);
  });

  it("limits Employee to self-service actions only", () => {
    const session = sessionFor("EMPLOYEE");
    expect(hasPermission(session, "attendance.self")).toBe(true);
    expect(hasPermission(session, "leave.apply")).toBe(true);
    expect(hasPermission(session, "reports.view.self")).toBe(true);
    expect(hasPermission(session, "leave.approve")).toBe(false);
    expect(hasPermission(session, "employee.manage")).toBe(false);
    expect(hasPermission(session, "salary.view")).toBe(false);
  });

  it("requirePermission throws ForbiddenError when the permission is missing", () => {
    const session = sessionFor("EMPLOYEE");
    expect(() => requirePermission(session, "employee.delete")).toThrow(ForbiddenError);
  });

  it("requirePermission does not throw when the permission is present", () => {
    const session = sessionFor("ADMIN");
    expect(() => requirePermission(session, "employee.delete")).not.toThrow();
  });
});

describe("employeeSelect field visibility", () => {
  it("omits salary for plain employees", () => {
    const select = employeeSelect(sessionFor("EMPLOYEE"));
    expect(select.salary).toBe(false);
  });

  it("includes salary for Admin", () => {
    expect(employeeSelect(sessionFor("ADMIN")).salary).toBe(true);
  });
});
