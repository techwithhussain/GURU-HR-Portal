import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { PERMISSION_KEYS, ROLE_PERMISSIONS, type RoleName } from "@/types/permissions";

const SEED_ADMIN_PASSWORD = "ChangeMe123!";

// Default company shifts — every shift is 9h total with a 1h break allowance,
// netting 8h of working time. Night shifts cross midnight (end <= start).
const DEFAULT_SHIFTS = [
  { id: "seed-shift-a", name: "Shift A", startMinutesOfDay: 10 * 60, endMinutesOfDay: 19 * 60 },
  { id: "seed-shift-b", name: "Shift B", startMinutesOfDay: 11 * 60, endMinutesOfDay: 20 * 60 },
  { id: "seed-shift-c", name: "Shift C", startMinutesOfDay: 12 * 60, endMinutesOfDay: 21 * 60 },
  { id: "seed-night-shift-a", name: "Night Shift A", startMinutesOfDay: 21 * 60, endMinutesOfDay: 6 * 60 },
  { id: "seed-night-shift-b", name: "Night Shift B", startMinutesOfDay: 22 * 60, endMinutesOfDay: 7 * 60 },
  { id: "seed-night-shift-c", name: "Night Shift C", startMinutesOfDay: 23 * 60, endMinutesOfDay: 8 * 60 },
];

// Digital marketing agency org structure — department -> its designations.
const ORG_STRUCTURE: Record<string, string[]> = {
  SEO: ["SEO Executive", "SEO Specialist", "Senior SEO Specialist", "SEO Manager"],
  "Web Development": [
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "WordPress Developer",
    "Shopify Developer",
  ],
  "Graphic Design": ["Graphic Designer", "Senior Graphic Designer", "UI/UX Designer"],
  "Video Editing": ["Video Editor", "Motion Graphic Designer"],
  "Social Media Marketing": ["Social Media Executive", "Social Media Manager"],
  "Performance Marketing": ["Google Ads Specialist", "Meta Ads Specialist", "PPC Specialist"],
  "Content Writing": ["Content Writer", "Copywriter"],
  "Sales & Business Development": ["Sales Executive", "Business Development Executive"],
  "Customer Support": ["Customer Support Executive", "Client Relationship Executive"],
  "Accounts & Finance": ["Accountant", "Finance Executive"],
  Administration: ["Office Administrator"],
  Management: ["Project Manager", "Operations Manager"],
  General: ["Intern"],
};

// Default leave type catalog — Admin can add/edit/deactivate/delete more later
// via the Leave Types admin UI. `defaultAllocationDays: undefined` = unlimited.
const DEFAULT_LEAVE_TYPES = [
  { code: "CL", name: "Casual Leave", defaultAllocationDays: 12, requiresAttachment: false, color: "#f97316" },
  { code: "SL", name: "Sick Leave", defaultAllocationDays: 10, requiresAttachment: true, color: "#ef4444" },
  { code: "EL", name: "Earned Leave", defaultAllocationDays: 15, requiresAttachment: false, color: "#22c55e" },
  { code: "HALF_DAY", name: "Half Day Leave", defaultAllocationDays: 12, requiresAttachment: false, color: "#a855f7" },
  { code: "WFH", name: "Work From Home", defaultAllocationDays: 24, requiresAttachment: false, color: "#3b82f6" },
  { code: "EMERGENCY", name: "Emergency Leave", defaultAllocationDays: 5, requiresAttachment: false, color: "#eab308" },
  { code: "LWP", name: "Unpaid Leave", defaultAllocationDays: undefined, requiresAttachment: false, color: "#6b7280" },
];

async function seedLeaveTypes() {
  for (const t of DEFAULT_LEAVE_TYPES) {
    await prisma.leaveType.upsert({
      where: { code: t.code },
      update: {},
      create: {
        code: t.code,
        name: t.name,
        defaultAllocationDays: t.defaultAllocationDays,
        requiresAttachment: t.requiresAttachment,
        color: t.color,
      },
    });
  }
}

async function seedPermissions() {
  for (const key of PERMISSION_KEYS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }
}

async function seedRoles(): Promise<Record<RoleName, string>> {
  const roleIds = {} as Record<RoleName, string>;

  for (const roleName of Object.keys(ROLE_PERMISSIONS) as RoleName[]) {
    const existed = await prisma.role.findUnique({ where: { name: roleName } });

    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, isSystem: true },
    });
    roleIds[roleName] = role.id;

    // Only seed a role's permissions on first creation — once it exists, its
    // RolePermission rows may have been customized via the RBAC admin UI, and
    // re-running the seed must not silently wipe that customization.
    if (!existed) {
      const permissions = await prisma.permission.findMany({
        where: { key: { in: ROLE_PERMISSIONS[roleName] } },
      });

      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      await prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      });
    }
  }

  return roleIds;
}

async function seedCompanySettings() {
  const existing = await prisma.companySetting.findFirst();
  if (!existing) {
    await prisma.companySetting.create({
      data: {
        name: "Guru Digital Advertising",
        timezone: "Asia/Kolkata",
        officeIps: [],
      },
    });
  }
}

async function seedOrgStructure() {
  const designationIds: Record<string, Record<string, string>> = {};

  for (const [deptName, designationNames] of Object.entries(ORG_STRUCTURE)) {
    const dept = await prisma.department.upsert({
      where: { name: deptName },
      update: {},
      create: { name: deptName },
    });

    designationIds[deptName] = {};
    for (const designationName of designationNames) {
      const designation = await prisma.designation.upsert({
        where: { departmentId_name: { departmentId: dept.id, name: designationName } },
        update: {},
        create: { name: designationName, departmentId: dept.id },
      });
      designationIds[deptName][designationName] = designation.id;
    }
  }

  const managementDept = await prisma.department.findUniqueOrThrow({ where: { name: "Management" } });

  let defaultShift: Awaited<ReturnType<typeof prisma.shift.upsert>> | undefined;
  for (const s of DEFAULT_SHIFTS) {
    const shift = await prisma.shift.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        name: s.name,
        startMinutesOfDay: s.startMinutesOfDay,
        endMinutesOfDay: s.endMinutesOfDay,
        gracePeriodMin: 10,
        halfDayThresholdMin: 240,
        overtimeRule: { thresholdMin: 15, roundingMin: 15 },
        weeklyOff: [0], // Sunday
        breakAllowanceMin: 60,
      },
    });
    if (s.id === "seed-shift-a") defaultShift = shift;
  }

  return {
    managementDept,
    operationsManagerDesignationId: designationIds.Management["Operations Manager"],
    defaultShift: defaultShift!,
  };
}

async function seedAdmin(
  roleIds: Record<RoleName, string>,
  dayShiftId: string,
  managementDeptId: string,
  operationsManagerDesignationId: string,
) {
  const existing = await prisma.user.findUnique({ where: { employeeCode: "EMP0001" } });
  if (existing) return;

  const passwordHash = await hashPassword(SEED_ADMIN_PASSWORD);

  const user = await prisma.user.create({
    data: {
      employeeCode: "EMP0001",
      email: "admin@gurudigitaladvertising.com",
      passwordHash,
      roleId: roleIds.ADMIN,
      mustChangePassword: true,
    },
  });

  await prisma.employee.create({
    data: {
      userId: user.id,
      fullName: "Admin",
      departmentId: managementDeptId,
      designationId: operationsManagerDesignationId,
      shiftId: dayShiftId,
      joiningDate: new Date(),
      status: "ACTIVE",
    },
  });

  console.log(`Seeded Admin — employeeCode=EMP0001, password=${SEED_ADMIN_PASSWORD} (change on first login)`);
}

async function main() {
  await seedPermissions();
  const roleIds = await seedRoles();
  await seedCompanySettings();
  await seedLeaveTypes();
  const { managementDept, operationsManagerDesignationId, defaultShift } = await seedOrgStructure();
  await seedAdmin(roleIds, defaultShift.id, managementDept.id, operationsManagerDesignationId);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
