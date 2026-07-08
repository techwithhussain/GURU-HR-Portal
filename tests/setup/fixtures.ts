import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { ROLE_PERMISSIONS, type RoleName } from "@/types/permissions";

export async function seedRolesAndPermissions(): Promise<Record<RoleName, string>> {
  const allPermissionKeys = new Set(Object.values(ROLE_PERMISSIONS).flat());
  for (const key of allPermissionKeys) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }

  const roleIds = {} as Record<RoleName, string>;
  for (const roleName of Object.keys(ROLE_PERMISSIONS) as RoleName[]) {
    const role = await prisma.role.create({ data: { name: roleName, isSystem: true } });
    roleIds[roleName] = role.id;

    const permissions = await prisma.permission.findMany({
      where: { key: { in: ROLE_PERMISSIONS[roleName] } },
    });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });
  }

  return roleIds;
}

export async function seedCompanySettings(officeIps: string[] = []) {
  return prisma.companySetting.create({ data: { officeIps } });
}

export async function createTestShift(overrides: Partial<Parameters<typeof prisma.shift.create>[0]["data"]> = {}) {
  return prisma.shift.create({
    data: {
      name: "Day Shift",
      startMinutesOfDay: 9 * 60,
      endMinutesOfDay: 18 * 60,
      gracePeriodMin: 10,
      halfDayThresholdMin: 240,
      overtimeRule: { thresholdMin: 15, roundingMin: 15 },
      weeklyOff: [0],
      ...overrides,
    },
  });
}

export async function createTestEmployee(params: {
  employeeCode: string;
  email: string;
  password: string;
  roleId: string;
  shiftId?: string;
  mustChangePassword?: boolean;
}) {
  const passwordHash = await hashPassword(params.password);
  const user = await prisma.user.create({
    data: {
      employeeCode: params.employeeCode,
      email: params.email,
      passwordHash,
      roleId: params.roleId,
      mustChangePassword: params.mustChangePassword ?? false,
    },
  });
  const employee = await prisma.employee.create({
    data: {
      userId: user.id,
      fullName: "Test Employee",
      joiningDate: new Date(),
      shiftId: params.shiftId,
    },
  });
  return { user, employee };
}
