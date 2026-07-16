/**
 * Cleanup script: remove all test/orphan attendance & break data from production.
 * Run with: npx dotenv-cli -e .env.production.local -- npx tsx scripts/cleanup-test-data.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/prisma-client/client";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // 1. Close any open (active) breaks
  const openBreaks = await prisma.break.updateMany({
    where: { endAt: null },
    data: { endAt: new Date(), durationMin: 0 },
  });
  console.log(`✅ Closed ${openBreaks.count} open break(s)`);

  // 2. Delete all breaks
  const deletedBreaks = await prisma.break.deleteMany({});
  console.log(`✅ Deleted ${deletedBreaks.count} break record(s)`);

  // 3. Delete all attendance records
  const deletedAttendance = await prisma.attendance.deleteMany({});
  console.log(`✅ Deleted ${deletedAttendance.count} attendance record(s)`);

  // 4. Soft-delete any non-admin employees (test employees like Sajad)
  const testEmployees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      user: {
        role: { name: { not: "ADMIN" } },
      },
    },
    select: { id: true, fullName: true, userId: true },
  });

  for (const emp of testEmployees) {
    await prisma.employee.update({
      where: { id: emp.id },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    });
    await prisma.user.update({
      where: { id: emp.userId },
      data: { status: "INACTIVE" },
    });
    console.log(`🗑️  Removed test employee: ${emp.fullName}`);
  }

  console.log("\n✅ Cleanup complete! DB is ready for real employee data.");
  console.log("   Now import your real employees via Admin → Employees → Import CSV");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
