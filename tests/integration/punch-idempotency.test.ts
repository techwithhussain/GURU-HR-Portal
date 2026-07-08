import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { closeDb, resetDatabase } from "../setup/testDb";
import {
  createTestEmployee,
  createTestShift,
  seedCompanySettings,
  seedRolesAndPermissions,
} from "../setup/fixtures";
import * as attendanceService from "@/services/attendanceService";
import type { SessionContext } from "@/types/session";

function actorFor(userId: string, employeeId: string, roleId: string): SessionContext {
  return {
    sessionId: "test-session",
    userId,
    employeeId,
    employeeCode: "EMP",
    roleId,
    roleName: "EMPLOYEE",
    permissions: ["attendance.self"],
    mustChangePassword: false,
  };
}

describe("attendance punch idempotency (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeDb();
  });

  it("returns the same record for concurrent duplicate check-ins", async () => {
    const roleIds = await seedRolesAndPermissions();
    await seedCompanySettings();
    const shift = await createTestShift();
    const { user, employee } = await createTestEmployee({
      employeeCode: "EMP200",
      email: "emp200@example.com",
      password: "Passw0rd!!",
      roleId: roleIds.EMPLOYEE,
      shiftId: shift.id,
    });
    const actor = actorFor(user.id, employee.id, roleIds.EMPLOYEE);

    const [a, b] = await Promise.all([
      attendanceService.checkIn(employee.id, actor, {}),
      attendanceService.checkIn(employee.id, actor, {}),
    ]);

    expect(a.id).toBe(b.id);

    const rowCount = await prisma.attendance.count({ where: { employeeId: employee.id } });
    expect(rowCount).toBe(1);
  });

  it("rejects check-out without an active check-in", async () => {
    const roleIds = await seedRolesAndPermissions();
    await seedCompanySettings();
    const shift = await createTestShift();
    const { user, employee } = await createTestEmployee({
      employeeCode: "EMP201",
      email: "emp201@example.com",
      password: "Passw0rd!!",
      roleId: roleIds.EMPLOYEE,
      shiftId: shift.id,
    });
    const actor = actorFor(user.id, employee.id, roleIds.EMPLOYEE);

    await expect(attendanceService.checkOut(employee.id, actor, {})).rejects.toThrow();
  });

  it("rejects check-out while a break is still active", async () => {
    const roleIds = await seedRolesAndPermissions();
    await seedCompanySettings();
    const shift = await createTestShift();
    const { user, employee } = await createTestEmployee({
      employeeCode: "EMP202",
      email: "emp202@example.com",
      password: "Passw0rd!!",
      roleId: roleIds.EMPLOYEE,
      shiftId: shift.id,
    });
    const actor = actorFor(user.id, employee.id, roleIds.EMPLOYEE);

    await attendanceService.checkIn(employee.id, actor, {});
    await attendanceService.startBreak(employee.id, "LUNCH", actor, {});

    await expect(attendanceService.checkOut(employee.id, actor, {})).rejects.toThrow();
  });

  it("completes a full check-in -> break -> check-out cycle with working minutes computed", async () => {
    const roleIds = await seedRolesAndPermissions();
    await seedCompanySettings();
    const shift = await createTestShift();
    const { user, employee } = await createTestEmployee({
      employeeCode: "EMP203",
      email: "emp203@example.com",
      password: "Passw0rd!!",
      roleId: roleIds.EMPLOYEE,
      shiftId: shift.id,
    });
    const actor = actorFor(user.id, employee.id, roleIds.EMPLOYEE);

    await attendanceService.checkIn(employee.id, actor, {});
    await attendanceService.startBreak(employee.id, "LUNCH", actor, {});
    await attendanceService.endBreak(employee.id, actor, {});
    const result = await attendanceService.checkOut(employee.id, actor, {});

    expect(result.checkOutAt).not.toBeNull();
    expect(result.workingMinutes).not.toBeNull();
    expect(result.workingMinutes).toBeGreaterThanOrEqual(0);
  });

  it("rejects starting a second break while one is already active", async () => {
    const roleIds = await seedRolesAndPermissions();
    await seedCompanySettings();
    const shift = await createTestShift();
    const { user, employee } = await createTestEmployee({
      employeeCode: "EMP204",
      email: "emp204@example.com",
      password: "Passw0rd!!",
      roleId: roleIds.EMPLOYEE,
      shiftId: shift.id,
    });
    const actor = actorFor(user.id, employee.id, roleIds.EMPLOYEE);

    await attendanceService.checkIn(employee.id, actor, {});
    await attendanceService.startBreak(employee.id, "LUNCH", actor, {});

    await expect(attendanceService.startBreak(employee.id, "TEA", actor, {})).rejects.toThrow();
  });
});
