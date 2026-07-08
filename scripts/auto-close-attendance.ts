import { prisma } from "@/lib/prisma";
import { autoCloseStaleAttendance } from "@/services/attendanceService";

async function main() {
  const result = await autoCloseStaleAttendance();
  console.log(`Auto-closed ${result.closedCount} stale attendance record(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
