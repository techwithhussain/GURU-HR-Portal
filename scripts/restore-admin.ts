/**
 * Emergency script: restore the deleted admin user on production.
 * Run with: dotenv -e .env.production.local -- tsx scripts/restore-admin.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/prisma-client/client";
import { hashPassword } from "@/lib/password";

const NEW_PASSWORD = "ChangeMe123!";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // 1. Find ADMIN role
  const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  if (!adminRole) {
    console.error("❌ ADMIN role not found in DB. Run full seed first.");
    process.exit(1);
  }

  // 2. Check if EMP0001 already exists (soft-deleted or active)
  const existing = await prisma.user.findUnique({ where: { employeeCode: "EMP0001" } });
  if (existing) {
    // Just reset the password and reactivate
    const passwordHash = await hashPassword(NEW_PASSWORD);
    await prisma.user.update({
      where: { employeeCode: "EMP0001" },
      data: { passwordHash, status: "ACTIVE", mustChangePassword: true, lockedUntil: null, failedLoginAttempts: 0 },
    });
    console.log("✅ Admin user already exists — password reset to:", NEW_PASSWORD);
    await prisma.$disconnect();
    return;
  }

  // 3. Find Management dept + Operations Manager designation + default shift
  const managementDept = await prisma.department.findUnique({ where: { name: "Management" } });
  const defaultShift = await prisma.shift.findFirst({ where: { id: "seed-shift-a" } });

  let designationId: string | undefined;
  if (managementDept) {
    const designation = await prisma.designation.findFirst({
      where: { departmentId: managementDept.id, name: "Operations Manager" },
    });
    designationId = designation?.id;
  }

  // 4. Recreate admin user
  const passwordHash = await hashPassword(NEW_PASSWORD);
  const user = await prisma.user.create({
    data: {
      employeeCode: "EMP0001",
      email: "admin@gurudigitaladvertising.com",
      passwordHash,
      roleId: adminRole.id,
      mustChangePassword: true,
      status: "ACTIVE",
    },
  });

  // 5. Recreate employee record
  await prisma.employee.create({
    data: {
      userId: user.id,
      fullName: "Admin",
      departmentId: managementDept?.id ?? (await prisma.department.findFirst())!.id,
      designationId: designationId ?? (await prisma.designation.findFirst())!.id,
      shiftId: defaultShift?.id ?? (await prisma.shift.findFirst())!.id,
      joiningDate: new Date(),
      status: "ACTIVE",
    },
  });

  console.log("✅ Admin user restored successfully!");
  console.log("   Employee ID : EMP0001");
  console.log("   Password    :", NEW_PASSWORD);
  console.log("   ⚠️  Change password on first login!");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
