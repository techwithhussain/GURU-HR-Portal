import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mockCookieJar, mockCookiesImplementation } from "../setup/mockCookieJar";

vi.mock("next/headers", () => ({
  cookies: async () => mockCookiesImplementation(),
}));

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { closeDb, resetDatabase } from "../setup/testDb";
import { createTestEmployee, seedRolesAndPermissions } from "../setup/fixtures";
import * as authService from "@/services/authService";

const PASSWORD = "Passw0rd!!";

describe("auth flow (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockCookieJar.clear();
  });

  afterAll(async () => {
    await closeDb();
  });

  it("logs in with valid credentials and creates a session", async () => {
    const roleIds = await seedRolesAndPermissions();
    await createTestEmployee({
      employeeCode: "EMP100",
      email: "emp100@example.com",
      password: PASSWORD,
      roleId: roleIds.EMPLOYEE,
    });

    const result = await authService.login({
      employeeCode: "EMP100",
      password: PASSWORD,
      ip: "10.0.0.1",
      userAgent: "vitest",
    });

    expect(result.ok).toBe(true);
    expect(mockCookieJar.has(env.SESSION_COOKIE_NAME)).toBe(true);

    const sessions = await prisma.session.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].revokedAt).toBeNull();
  });

  it("rejects an invalid password with a generic error", async () => {
    const roleIds = await seedRolesAndPermissions();
    await createTestEmployee({
      employeeCode: "EMP101",
      email: "emp101@example.com",
      password: PASSWORD,
      roleId: roleIds.EMPLOYEE,
    });

    const result = await authService.login({
      employeeCode: "EMP101",
      password: "wrong-password",
      ip: null,
      userAgent: null,
    });

    expect(result).toEqual({ ok: false, error: "INVALID_CREDENTIALS" });
  });

  it("rejects an unknown employee code with the same generic error (no enumeration)", async () => {
    await seedRolesAndPermissions();

    const result = await authService.login({
      employeeCode: "DOES-NOT-EXIST",
      password: "whatever",
      ip: null,
      userAgent: null,
    });

    expect(result).toEqual({ ok: false, error: "INVALID_CREDENTIALS" });
  });

  it("locks the account after the configured number of failed attempts", async () => {
    const roleIds = await seedRolesAndPermissions();
    await createTestEmployee({
      employeeCode: "EMP102",
      email: "emp102@example.com",
      password: PASSWORD,
      roleId: roleIds.EMPLOYEE,
    });

    for (let i = 0; i < env.ACCOUNT_LOCKOUT_MAX_ATTEMPTS; i++) {
      await authService.login({
        employeeCode: "EMP102",
        password: "wrong-password",
        ip: null,
        userAgent: null,
      });
    }

    const result = await authService.login({
      employeeCode: "EMP102",
      password: PASSWORD,
      ip: null,
      userAgent: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("ACCOUNT_LOCKED");
    }
  });

  it("logout revokes the session and clears the cookie", async () => {
    const roleIds = await seedRolesAndPermissions();
    await createTestEmployee({
      employeeCode: "EMP103",
      email: "emp103@example.com",
      password: PASSWORD,
      roleId: roleIds.EMPLOYEE,
    });

    await authService.login({
      employeeCode: "EMP103",
      password: PASSWORD,
      ip: null,
      userAgent: null,
    });
    await authService.logout();

    const sessions = await prisma.session.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].revokedAt).not.toBeNull();
    expect(mockCookieJar.has(env.SESSION_COOKIE_NAME)).toBe(false);
  });
});
