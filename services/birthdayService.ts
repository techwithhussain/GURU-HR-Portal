import "server-only";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/services/notificationService";
import type { SessionContext } from "@/types/session";

export interface UpcomingBirthday {
  id: string;
  fullName: string;
  departmentName: string | null;
  daysUntil: number; // 0 = today, 1 = tomorrow
}

/** Returns today's date parts in the given timezone */
function todayParts(timezone: string): { month: number; day: number; dateStr: string } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date());
  const [month, day, year] = fmt.split("/").map(Number);
  return { month, day, dateStr: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
}

/** Get employees with birthday today (daysUntil=0) or tomorrow (daysUntil=1) */
export async function getUpcomingBirthdays(
  timezone: string,
  excludeEmployeeId?: string,
): Promise<UpcomingBirthday[]> {
  const { month: todayMonth, day: todayDay } = todayParts(timezone);

  // Tomorrow
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowFmt = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).format(tomorrowDate);
  const [tomorrowMonth, tomorrowDay] = tomorrowFmt.split("/").map(Number);

  const employees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      dateOfBirth: { not: null },
      ...(excludeEmployeeId ? { id: { not: excludeEmployeeId } } : {}),
    },
    select: {
      id: true,
      fullName: true,
      dateOfBirth: true,
      department: { select: { name: true } },
    },
  });

  const upcoming: UpcomingBirthday[] = [];

  for (const emp of employees) {
    if (!emp.dateOfBirth) continue;
    const dob = new Date(emp.dateOfBirth);
    const dobMonth = dob.getMonth() + 1;
    const dobDay = dob.getDate();

    if (dobMonth === todayMonth && dobDay === todayDay) {
      upcoming.push({ id: emp.id, fullName: emp.fullName, departmentName: emp.department?.name ?? null, daysUntil: 0 });
    } else if (dobMonth === tomorrowMonth && dobDay === tomorrowDay) {
      upcoming.push({ id: emp.id, fullName: emp.fullName, departmentName: emp.department?.name ?? null, daysUntil: 1 });
    }
  }

  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Called on each dashboard load.
 * Sends BIRTHDAY_REMINDER notifications to the current user for any upcoming
 * birthdays they have NOT yet been notified about today.
 * Fully idempotent — safe to call on every page visit.
 */
export async function dispatchBirthdayNotifications(
  actor: SessionContext,
  timezone: string,
): Promise<void> {
  if (!actor.employeeId) return;

  const { dateStr } = todayParts(timezone);

  const upcoming = await getUpcomingBirthdays(timezone, actor.employeeId);
  if (upcoming.length === 0) return;

  // Check which birthday people the user has already been notified about today
  const existingToday = await prisma.notification.findMany({
    where: {
      userId: actor.userId,
      type: "BIRTHDAY_REMINDER",
      createdAt: { gte: new Date(dateStr) },
    },
    select: { payload: true },
  });

  const alreadyNotified = new Set(
    existingToday
      .map((n) => {
        const p = n.payload as Record<string, unknown>;
        return typeof p.employeeId === "string" ? p.employeeId : null;
      })
      .filter(Boolean) as string[],
  );

  for (const person of upcoming) {
    if (alreadyNotified.has(person.id)) continue;

    await notifyUser(actor.userId, "BIRTHDAY_REMINDER", {
      employeeId: person.id,
      name: person.fullName,
      daysUntil: person.daysUntil,
      date: dateStr,
    });
  }
}
