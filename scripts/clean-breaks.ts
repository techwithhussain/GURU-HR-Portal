/**
 * Script to clean up stale breaks for a specific employee by name on a specific date.
 * Run with: dotenv -e .env.production.local -- tsx scripts/clean-breaks.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/prisma-client/client";
import pg from "pg";

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const employeeIds = ["cmrgznr0c000bx34v8ejb26ah", "cmrnx9oxn000og34v5jc21hwc"];
  const targetDate = new Date("2026-07-18T00:00:00.000Z");

  for (const id of employeeIds) {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) continue;

    console.log(`Checking employee: ${employee.fullName} (${id})`);

    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: id,
        attendanceDate: targetDate
      }
    });

    if (attendance) {
      const deleted = await prisma.break.deleteMany({
        where: { attendanceId: attendance.id }
      });
      console.log(`✅ Deleted ${deleted.count} breaks for ${employee.fullName} (Attendance ID: ${attendance.id})`);
    } else {
      console.log(`❌ No attendance found for ${employee.fullName} on 2026-07-18`);
    }
  }

  await pool.end();
}

main().catch(console.error);
