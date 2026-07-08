import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { closeDb, resetDatabase } from "../setup/testDb";
import {
  createTestEmployee,
  createTestShift,
  seedCompanySettings,
  seedRolesAndPermissions,
} from "../setup/fixtures";

describe("attendance unique constraint (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeDb();
  });

  it("rejects a direct duplicate insert for the same (employeeId, attendanceDate)", async () => {
    const roleIds = await seedRolesAndPermissions();
    await seedCompanySettings();
    const shift = await createTestShift();
    const { employee } = await createTestEmployee({
      employeeCode: "EMP300",
      email: "emp300@example.com",
      password: "Passw0rd!!",
      roleId: roleIds.EMPLOYEE,
      shiftId: shift.id,
    });

    const attendanceDate = new Date("2026-01-05T00:00:00.000Z");

    await prisma.attendance.create({
      data: { employeeId: employee.id, attendanceDate, shiftId: shift.id, checkInAt: new Date() },
    });

    await expect(
      prisma.attendance.create({
        data: { employeeId: employee.id, attendanceDate, shiftId: shift.id, checkInAt: new Date() },
      }),
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  it("allows the same employee to have attendance rows on different days", async () => {
    const roleIds = await seedRolesAndPermissions();
    await seedCompanySettings();
    const shift = await createTestShift();
    const { employee } = await createTestEmployee({
      employeeCode: "EMP301",
      email: "emp301@example.com",
      password: "Passw0rd!!",
      roleId: roleIds.EMPLOYEE,
      shiftId: shift.id,
    });

    await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        attendanceDate: new Date("2026-01-05T00:00:00.000Z"),
        shiftId: shift.id,
        checkInAt: new Date(),
      },
    });
    await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        attendanceDate: new Date("2026-01-06T00:00:00.000Z"),
        shiftId: shift.id,
        checkInAt: new Date(),
      },
    });

    const count = await prisma.attendance.count({ where: { employeeId: employee.id } });
    expect(count).toBe(2);
  });
});
