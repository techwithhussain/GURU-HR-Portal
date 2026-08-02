/**
 * EMERGENCY FIX SCRIPT — Open Attendance Diagnosis & Fix
 *
 * Yeh script production par chalao SSH se:
 *   npx tsx scripts/fix-open-attendance.ts
 *
 * Yeh sirf READ karega — kuch change nahi karega jab tak --fix flag na ho.
 * Fix karne ke liye: npx tsx scripts/fix-open-attendance.ts --fix
 */

import { prisma } from "@/lib/prisma";

async function main() {
  const doFix = process.argv.includes("--fix");

  console.log("=== Open Attendance Diagnosis ===\n");

  // 1. Saare open attendance records dhundo (checkOutAt: null)
  const openRows = await prisma.attendance.findMany({
    where: { checkOutAt: null, checkInAt: { not: null } },
    include: {
      employee: { select: { fullName: true, id: true } },
      shift: true,
      breaks: { where: { endAt: null } }, // open breaks
    },
    orderBy: { checkInAt: "desc" },
  });

  console.log(`Open attendance records found: ${openRows.length}\n`);

  for (const row of openRows) {
    console.log(`---`);
    console.log(`Employee: ${row.employee.fullName} (${row.employee.id})`);
    console.log(`Attendance ID: ${row.id}`);
    console.log(`Check-in: ${row.checkInAt?.toISOString()}`);
    console.log(`Attendance Date: ${row.attendanceDate.toISOString().slice(0, 10)}`);
    console.log(`Shift: ${row.shift.name} (${row.shift.startMinutesOfDay} - ${row.shift.endMinutesOfDay} min)`);
    console.log(`Open Breaks: ${row.breaks.length}`);

    if (row.breaks.length > 0) {
      console.log(
        `  WARNING: OPEN BREAK DETECTED — Logout blocked until break is ended!`
      );
      for (const brk of row.breaks) {
        console.log(`  Break ID: ${brk.id}, Started: ${brk.startAt.toISOString()}, Type: ${brk.type}`);
      }

      if (doFix) {
        // Open break ko close kar do (current time par)
        const now = new Date();
        for (const brk of row.breaks) {
          const durationMin = Math.round(
            (now.getTime() - brk.startAt.getTime()) / 60_000
          );
          await prisma.break.update({
            where: { id: brk.id },
            data: { endAt: now, durationMin },
          });
          console.log(
            `  FIXED: Break ${brk.id} closed. Duration: ${durationMin} min`
          );
        }
        console.log(
          `  INFO: Now employee can manually logout from dashboard.`
        );
      } else {
        console.log(`  Run with --fix flag to close open breaks automatically.`);
      }
    } else {
      console.log(`  No open breaks — logout should work normally.`);
    }
  }

  if (openRows.length === 0) {
    console.log("No open attendance records found. Everything looks clean.");
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
