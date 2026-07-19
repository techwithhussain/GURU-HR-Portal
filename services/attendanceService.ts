import "server-only";
import { DateTime } from "luxon";
import { Prisma } from "@/lib/prisma-client/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/permissions";
import { recordAudit } from "@/services/auditService";
import type { SessionContext } from "@/types/session";
import type { RequestMeta } from "@/services/employeeService";
import { NotFoundError } from "@/services/employeeService";
import {
  attendanceDateForCheckIn,
  computeEarlyExitMinutes,
  computeLateMinutes,
  computeOvertimeMinutes,
  computeWorkingMinutes,
  determinePunchStatus,
  shiftEndInstant,
  shiftStartInstant,
  type ShiftTiming,
} from "@/lib/attendance/calculations";
import type { CorrectAttendanceInput } from "@/lib/validation/attendance";
import { notifyUsers } from "@/services/notificationService";

// Mirrors features/attendance/BreakSelectDialog.tsx's per-type suggested
// durations — duplicated here (not imported) since that file is a "use
// client" component and this service is server-only.
const BREAK_TYPE_MAX_MINUTES: Record<string, number> = {
  LUNCH: 30,
  WASHROOM: 20,
  PERSONAL: 10,
  MEETING: 60,
};

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

async function getCompanyTimezone(): Promise<string> {
  const settings = await prisma.companySetting.findFirst({ select: { timezone: true } });
  return settings?.timezone ?? "Asia/Kolkata";
}

/** Office-wide cap on simultaneous breaks — Admin-configurable in Company Settings. */
async function getMaxConcurrentBreaks(): Promise<number> {
  const settings = await prisma.companySetting.findFirst({ select: { maxConcurrentBreaks: true } });
  return settings?.maxConcurrentBreaks ?? 3;
}

function toShiftTiming(shift: {
  startMinutesOfDay: number;
  endMinutesOfDay: number;
  gracePeriodMin: number;
  halfDayThresholdMin: number;
  overtimeRule: Prisma.JsonValue;
}): ShiftTiming {
  const rule = shift.overtimeRule as { thresholdMin: number; roundingMin: number };
  return {
    startMinutesOfDay: shift.startMinutesOfDay,
    endMinutesOfDay: shift.endMinutesOfDay,
    gracePeriodMin: shift.gracePeriodMin,
    halfDayThresholdMin: shift.halfDayThresholdMin,
    overtimeRule: rule,
  };
}

async function requireEmployeeWithShift(employeeId: string) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, deletedAt: null },
    select: { id: true, shiftId: true, shift: true },
  });
  if (!employee) throw new NotFoundError("Employee not found");
  if (!employee.shiftId || !employee.shift) {
    throw new ConflictError("Employee has no shift assigned");
  }
  return employee as typeof employee & {
    shiftId: string;
    shift: NonNullable<typeof employee.shift>;
  };
}

export async function checkIn(employeeId: string, actor: SessionContext, meta: RequestMeta = {}) {
  requirePermission(actor, "attendance.self");

  const employee = await requireEmployeeWithShift(employeeId);
  const timezone = await getCompanyTimezone();
  const now = new Date();
  const shiftTiming = toShiftTiming(employee.shift);
  // Pass shiftTiming so that night-shift late logins (after midnight but
  // before shift end) are correctly attributed to the previous calendar day
  // — the day the shift actually started — rather than the current date.
  const attendanceDate = attendanceDateForCheckIn(now, timezone, shiftTiming);

  // ── Shift-window guard ───────────────────────────────────────────────────
  // Each employee has exactly one shift per day. Block login if the shift
  // window is not currently active:
  //   • Too early  → shift hasn't started yet (beyond the early-entry buffer)
  //   • Too late   → shift has already ended for this attendance date
  //
  // We allow EARLY_ENTRY_BUFFER_MIN minutes of early entry so employees can
  // tap in just before their shift starts without getting an error.
  const EARLY_ENTRY_BUFFER_MIN = 60;
  const shiftStart = shiftStartInstant(attendanceDate, shiftTiming, timezone);
  const shiftEnd = shiftEndInstant(attendanceDate, shiftTiming, timezone);
  const nowDt = DateTime.fromJSDate(now, { zone: "utc" });

  if (nowDt < shiftStart.minus({ minutes: EARLY_ENTRY_BUFFER_MIN })) {
    const startFmt = shiftStart.setZone(timezone).toFormat("hh:mm a");
    throw new ConflictError(
      `Your shift has not started yet. You can log in from ${startFmt} onwards.`,
    );
  }

  if (nowDt > shiftEnd) {
    const endFmt = shiftEnd.setZone(timezone).toFormat("hh:mm a");
    throw new ConflictError(
      `Your shift ended at ${endFmt}. You cannot log in again until your next shift starts.`,
    );
  }

  // ── Leave guard ──────────────────────────────────────────────────────────
  // An approved leave already owns this calendar day (it pre-creates an
  // ON_LEAVE placeholder row) — block here with a clear message instead of
  // silently falling through to the P2002 branch below, which would return
  // that placeholder as-is (checkInAt never set, status stuck on ON_LEAVE).
  const approvedLeaveToday = await prisma.leave.findFirst({
    where: { employeeId, status: "APPROVED", startDate: { lte: attendanceDate }, endDate: { gte: attendanceDate } },
  });
  if (approvedLeaveToday) {
    throw new ConflictError(
      "You have an approved leave for today. Ask Admin to cancel it first if you need to log in.",
    );
  }

  // Status at check-in only reflects lateness — HALF_DAY is only meaningful
  // once working minutes are known at checkout, so determinePunchStatus (which
  // would spuriously read 0 worked minutes as HALF_DAY) isn't used here.
  const lateMinutes = computeLateMinutes(now, attendanceDate, shiftTiming, timezone);

  try {
    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        attendanceDate,
        shiftId: employee.shiftId,
        checkInAt: now,
        checkInIp: meta.ip ?? undefined,
        checkInUserAgent: meta.userAgent ?? undefined,
        lateMinutes,
        status: lateMinutes > 0 ? "LATE" : "PRESENT",
      },
    });

    await recordAudit({
      actorUserId: actor.userId,
      action: "attendance.check_in",
      targetEntity: "attendance",
      targetId: attendance.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { lateMinutes },
    });

    if (lateMinutes > 0) {
      const employeeWithManager = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { fullName: true, userId: true, manager: { select: { userId: true } } },
      });
      if (employeeWithManager) {
        const recipientUserIds = [employeeWithManager.userId];
        if (employeeWithManager.manager) recipientUserIds.push(employeeWithManager.manager.userId);
        await notifyUsers(
          recipientUserIds,
          "LATE_CHECK_IN",
          { attendanceId: attendance.id, lateMinutes },
          {
            subject: `Late login — ${employeeWithManager.fullName}`,
            text: `${employeeWithManager.fullName} logged in ${lateMinutes} minute(s) late today.`,
          },
        );
      }
    }

    return attendance;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.attendance.findUnique({
        where: { employeeId_attendanceDate: { employeeId, attendanceDate } },
      });
      if (existing) {
        // The same calendar date already has a completed (checked-out) session.
        // This is the common night-shift scenario: the employee logged in during
        // the early-morning portion of yesterday's shift (which maps to today's
        // calendar date) and already logged out — now they're trying to start a
        // brand-new session for tonight's shift, but both map to the same
        // attendanceDate. Surface a clear error so Admin can correct the existing
        // record (clear its checkOutAt) to allow re-login, rather than silently
        // returning the stale closed record and leaving the UI stuck.
        if (existing.checkOutAt !== null) {
          throw new ConflictError(
            "An attendance record for today already exists and is closed. " +
            "For night shift re-login, ask Admin to correct today's attendance record (clear the logout time) so you can log in again.",
          );
        }
        // Still open (no checkout yet) — idempotent, return the open record.
        return existing;
      }
    }
    throw err;
  }
}

export async function checkOut(employeeId: string, actor: SessionContext, meta: RequestMeta = {}) {
  requirePermission(actor, "attendance.self");

  const openAttendance = await prisma.attendance.findFirst({
    where: { employeeId, checkOutAt: null },
    orderBy: { checkInAt: "desc" },
    include: { shift: true },
  });
  if (!openAttendance || !openAttendance.checkInAt) {
    throw new ConflictError("No active login found");
  }

  const activeBreak = await prisma.break.findFirst({
    where: { attendanceId: openAttendance.id, endAt: null },
  });
  if (activeBreak) {
    throw new ConflictError("End your active break before logging out");
  }

  const timezone = await getCompanyTimezone();
  const now = new Date();

  const breakAgg = await prisma.break.aggregate({
    where: { attendanceId: openAttendance.id },
    _sum: { durationMin: true },
  });
  const totalBreakMinutes = breakAgg._sum.durationMin ?? 0;

  const shiftTiming = toShiftTiming(openAttendance.shift);
  const workingMinutes = computeWorkingMinutes(openAttendance.checkInAt, now, totalBreakMinutes);
  const earlyExitMinutes = computeEarlyExitMinutes(now, openAttendance.attendanceDate, shiftTiming, timezone);
  const overtimeMinutes = computeOvertimeMinutes(workingMinutes, openAttendance.attendanceDate, shiftTiming, timezone);
  const status = determinePunchStatus(openAttendance.lateMinutes, workingMinutes, shiftTiming.halfDayThresholdMin);

  const updated = await prisma.attendance.update({
    where: { id: openAttendance.id },
    data: {
      checkOutAt: now,
      checkOutIp: meta.ip ?? undefined,
      checkOutUserAgent: meta.userAgent ?? undefined,
      workingMinutes,
      breakMinutes: totalBreakMinutes,
      earlyExitMinutes,
      overtimeMinutes,
      status,
    },
  });

  await recordAudit({
    actorUserId: actor.userId,
    action: "attendance.check_out",
    targetEntity: "attendance",
    targetId: updated.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { workingMinutes, earlyExitMinutes, overtimeMinutes },
  });

  return updated;
}

async function requireOpenAttendance(employeeId: string) {
  const attendance = await prisma.attendance.findFirst({
    where: { employeeId, checkOutAt: null },
    orderBy: { checkInAt: "desc" },
  });
  if (!attendance) throw new ConflictError("Log in before managing breaks");
  return attendance;
}

export async function startBreak(
  employeeId: string,
  type: string,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "attendance.self");

  const attendance = await requireOpenAttendance(employeeId);
  const maxConcurrentBreaks = await getMaxConcurrentBreaks();

  // The existing-break / concurrent-cap / daily-allowance checks and the
  // insert all run inside one Serializable transaction, so two simultaneous
  // requests can't both read "under the limit" and both insert — Postgres
  // aborts one with a serialization failure, which we surface as a clean
  // conflict below instead of letting the cap be exceeded.
  try {
    const brk = await prisma.$transaction(
      async (tx) => {
        const existingOpenBreak = await tx.break.findFirst({
          where: { attendanceId: attendance.id, endAt: null },
        });
        if (existingOpenBreak) throw new ConflictError("A break is already active");

        const activeBreaksCompanyWide = await tx.break.count({ where: { endAt: null } });
        if (activeBreaksCompanyWide >= maxConcurrentBreaks) {
          throw new ConflictError(
            `Break is full right now (${maxConcurrentBreaks}/${maxConcurrentBreaks} slots taken) — please wait for a colleague to finish their break.`,
          );
        }

        const shift = await tx.shift.findUnique({
          where: { id: attendance.shiftId },
          select: { breakAllowanceMin: true },
        });
        if (shift?.breakAllowanceMin != null) {
          const breakAgg = await tx.break.aggregate({
            where: { attendanceId: attendance.id },
            _sum: { durationMin: true },
          });
          const usedMinutes = breakAgg._sum.durationMin ?? 0;
          if (usedMinutes >= shift.breakAllowanceMin) {
            throw new ConflictError(
              `Break allowance exceeded — this shift allows ${shift.breakAllowanceMin} minute(s) of break per day.`,
            );
          }
        }

        return tx.break.create({
          data: {
            attendanceId: attendance.id,
            type: type as Prisma.BreakCreateInput["type"],
            startAt: new Date(),
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await recordAudit({
      actorUserId: actor.userId,
      action: "attendance.break_start",
      targetEntity: "break",
      targetId: brk.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { type },
    });

    return brk;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.break.findFirst({
        where: { attendanceId: attendance.id, endAt: null },
      });
      if (existing) return existing;
    }
    // A serialization failure (P2034) means another concurrent request won
    // the race for the same slot — treat it the same as "already active/full"
    // rather than surfacing a raw transaction error.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      throw new ConflictError("That break slot was just taken — please try again.");
    }
    throw err;
  }
}

export async function endBreak(employeeId: string, actor: SessionContext, meta: RequestMeta = {}) {
  requirePermission(actor, "attendance.self");

  const attendance = await requireOpenAttendance(employeeId);
  const openBreak = await prisma.break.findFirst({
    where: { attendanceId: attendance.id, endAt: null },
  });
  if (!openBreak) throw new ConflictError("No active break to end");

  const now = new Date();
  const durationMin = Math.round((now.getTime() - openBreak.startAt.getTime()) / 60_000);

  const updated = await prisma.break.update({
    where: { id: openBreak.id },
    data: { endAt: now, durationMin },
  });

  await recordAudit({
    actorUserId: actor.userId,
    action: "attendance.break_end",
    targetEntity: "break",
    targetId: updated.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { durationMin },
  });

  const maxMinutes = BREAK_TYPE_MAX_MINUTES[openBreak.type];
  if (maxMinutes != null && durationMin > maxMinutes) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { fullName: true } });
    const admins = await prisma.user.findMany({
      where: { role: { name: "ADMIN" }, status: "ACTIVE" },
      select: { id: true },
    });
    await notifyUsers(
      admins.map((a) => a.id),
      "BREAK_LIMIT_EXCEEDED",
      { employeeId, employeeName: employee?.fullName ?? "An employee", type: openBreak.type, durationMin, maxMinutes },
    );
  }

  return updated;
}

export async function getCurrentStatus(employeeId: string) {
  const timezone = await getCompanyTimezone();
  const today = attendanceDateForCheckIn(new Date(), timezone);

  const [openAttendance, todayAttendance] = await Promise.all([
    // openAttendance is NOT scoped to today's date — a night-shift employee
    // (e.g. 9 PM – 6 AM) logs in on Day N, but after midnight the calendar
    // rolls to Day N+1. If we only looked at attendanceDate = today (N+1)
    // we'd find nothing and incorrectly show NOT_CHECKED_IN while they're
    // still mid-shift.
    prisma.attendance.findFirst({
      where: { employeeId, checkOutAt: null },
      orderBy: { checkInAt: "desc" },
      include: { breaks: true },
    }),
    prisma.attendance.findFirst({
      where: { employeeId, attendanceDate: today },
      include: { breaks: true },
    }),
  ]);

  // Prefer an open session (any date) over a completed today-record.
  // This is the key night-shift fix: if the employee is still logged in from
  // a shift that started yesterday, openAttendance wins and the dashboard
  // correctly shows CHECKED_IN / ON_BREAK rather than CHECKED_OUT.
  const current = openAttendance ?? todayAttendance;
  if (!current) return { state: "NOT_CHECKED_IN" as const };

  const activeBreak = current.breaks.find((b) => !b.endAt);
  if (!current.checkOutAt) {
    const [shift, activeBreaksCompanyWide, maxConcurrentBreaks] = await Promise.all([
      prisma.shift.findUnique({ where: { id: current.shiftId } }),
      prisma.break.count({ where: { endAt: null } }),
      getMaxConcurrentBreaks(),
    ]);
    const usedMinutes = current.breaks.reduce((sum, b) => sum + (b.durationMin ?? 0), 0);
    const breakBudget =
      shift?.breakAllowanceMin != null ? { usedMinutes, allowanceMinutes: shift.breakAllowanceMin } : null;
    const companyBreakSlots = { active: activeBreaksCompanyWide, max: maxConcurrentBreaks };
    const shiftEndAt = shift ? shiftEndInstant(current.attendanceDate, toShiftTiming(shift), timezone).toJSDate().toISOString() : null;

    if (activeBreak) {
      return { state: "ON_BREAK" as const, attendance: current, activeBreak, breakBudget, companyBreakSlots, shiftEndAt };
    }
    return { state: "CHECKED_IN" as const, attendance: current, breakBudget, companyBreakSlots, shiftEndAt };
  }
  return { state: "CHECKED_OUT" as const, attendance: current };
}

export interface EmployeeOnBreak {
  breakId: string;
  type: string;
  startAt: Date;
  employeeId: string;
  employeeName: string;
  department: string | null;
  profileImageUrl: string | null;
  /** Completed break minutes today (excludes the currently-open break itself). */
  completedBreakMinutesToday: number;
  /** The shift's daily break allowance, if one is set. */
  breakAllowanceMinutes: number | null;
}

/**
 * Currently-active breaks across all employees — powers the office TV board
 * and the admin live-alert listener. No `endAt` means the break is ongoing.
 */
export async function getEmployeesOnBreak(): Promise<EmployeeOnBreak[]> {
  const breaks = await prisma.break.findMany({
    where: { endAt: null },
    select: {
      id: true,
      type: true,
      startAt: true,
      attendance: {
        select: {
          id: true,
          shift: { select: { breakAllowanceMin: true } },
          employee: {
            select: {
              id: true,
              fullName: true,
              profileImageUrl: true,
              department: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { startAt: "asc" },
  });

  const totals = await Promise.all(
    breaks.map((b) =>
      prisma.break.aggregate({
        where: { attendanceId: b.attendance.id },
        _sum: { durationMin: true },
      }),
    ),
  );

  return breaks.map((b, i) => ({
    breakId: b.id,
    type: b.type,
    startAt: b.startAt,
    employeeId: b.attendance.employee.id,
    employeeName: b.attendance.employee.fullName,
    department: b.attendance.employee.department?.name ?? null,
    profileImageUrl: b.attendance.employee.profileImageUrl,
    completedBreakMinutesToday: totals[i]._sum.durationMin ?? 0,
    breakAllowanceMinutes: b.attendance.shift?.breakAllowanceMin ?? null,
  }));
}

/**
 * Closes attendance rows whose shift ended without a checkout, so they stop
 * silently sitting open forever. Checkout is pinned to the shift's scheduled
 * end (not "now"), and the row is flagged for HR review/correction.
 */
export async function autoCloseStaleAttendance(): Promise<{ closedCount: number }> {
  const timezone = await getCompanyTimezone();
  const now = new Date();

  const openRows = await prisma.attendance.findMany({
    where: { checkOutAt: null, checkInAt: { not: null } },
    include: { shift: true },
  });

  let closedCount = 0;

  const admins = await prisma.user.findMany({
    where: { role: { name: "ADMIN" }, status: "ACTIVE" },
    select: { id: true },
  });
  const adminIds = admins.map((u) => u.id);

  for (const row of openRows) {
    if (!row.checkInAt) continue;

    // One row's failure (e.g. a transient email/SMTP error in the
    // notification step below) must not abort the whole batch — otherwise
    // every other employee queued after it in `openRows` silently never gets
    // auto-closed either, for as long as that one row keeps failing.
    try {
      const shiftTiming = toShiftTiming(row.shift);
      const scheduledEnd = shiftEndInstant(row.attendanceDate, shiftTiming, timezone).toJSDate();
      if (scheduledEnd.getTime() >= now.getTime()) continue;

      const activeBreak = await prisma.break.findFirst({
        where: { attendanceId: row.id, endAt: null },
      });
      if (activeBreak) {
        const durationMin = Math.max(
          0,
          Math.round((scheduledEnd.getTime() - activeBreak.startAt.getTime()) / 60_000),
        );
        await prisma.break.update({
          where: { id: activeBreak.id },
          data: { endAt: scheduledEnd, durationMin },
        });
      }

      const breakAgg = await prisma.break.aggregate({
        where: { attendanceId: row.id },
        _sum: { durationMin: true },
      });
      const totalBreakMinutes = breakAgg._sum.durationMin ?? 0;

      const workingMinutes = computeWorkingMinutes(row.checkInAt, scheduledEnd, totalBreakMinutes);
      const overtimeMinutes = computeOvertimeMinutes(workingMinutes, row.attendanceDate, shiftTiming, timezone);
      const status = determinePunchStatus(row.lateMinutes, workingMinutes, shiftTiming.halfDayThresholdMin);

      await prisma.attendance.update({
        where: { id: row.id },
        data: {
          checkOutAt: scheduledEnd,
          workingMinutes,
          breakMinutes: totalBreakMinutes,
          earlyExitMinutes: 0,
          overtimeMinutes,
          status,
          isAutoClosed: true,
          flaggedForReview: true,
        },
      });

      await recordAudit({
        action: "attendance.auto_closed",
        targetEntity: "attendance",
        targetId: row.id,
        metadata: { attendanceDate: row.attendanceDate.toISOString() },
      });

      const employee = await prisma.employee.findUnique({
        where: { id: row.employeeId },
        select: { fullName: true, userId: true },
      });
      if (employee) {
        const dateStr = row.attendanceDate.toISOString().slice(0, 10);
        await notifyUsers(
          [employee.userId, ...adminIds],
          "MISSED_CHECKOUT_AUTO_CLOSE",
          { attendanceId: row.id, attendanceDate: row.attendanceDate.toISOString() },
          {
            subject: `Missed logout — ${employee.fullName}`,
            text: `${employee.fullName} did not log out on ${dateStr}. The system auto-closed that day's attendance at shift end.`,
          },
        );
      }

      closedCount++;
    } catch (err) {
      console.error(`autoCloseStaleAttendance: failed to close attendance ${row.id}`, err);
    }
  }

  return { closedCount };
}

export async function updateAttendanceAdminNotes(
  attendanceId: string,
  notes: string,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "attendance.correct");

  const existing = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: { id: true, adminNotes: true },
  });
  if (!existing) throw new NotFoundError("Attendance record not found");

  const trimmed = notes.trim();
  const updated = await prisma.attendance.update({
    where: { id: attendanceId },
    data: { adminNotes: trimmed.length > 0 ? trimmed : null },
  });

  await recordAudit({
    actorUserId: actor.userId,
    action: "attendance.notes_updated",
    targetEntity: "attendance",
    targetId: attendanceId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    before: { adminNotes: existing.adminNotes },
    after: { adminNotes: updated.adminNotes },
  });

  return updated;
}

export async function correctAttendance(
  attendanceId: string,
  input: CorrectAttendanceInput,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "attendance.correct");

  const existing = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: { shift: true },
  });
  if (!existing) throw new NotFoundError("Attendance record not found");

  const timezone = await getCompanyTimezone();
  const shiftTiming = toShiftTiming(existing.shift);

  const checkInAt = input.checkInAt !== undefined ? input.checkInAt : existing.checkInAt;
  const checkOutAt = input.checkOutAt !== undefined ? input.checkOutAt : existing.checkOutAt;
  if (!checkInAt) throw new ConflictError("A login time is required");

  const breakAgg = await prisma.break.aggregate({
    where: { attendanceId },
    _sum: { durationMin: true },
  });
  const totalBreakMinutes = breakAgg._sum.durationMin ?? 0;

  const lateMinutes = computeLateMinutes(checkInAt, existing.attendanceDate, shiftTiming, timezone);
  const workingMinutes = checkOutAt
    ? computeWorkingMinutes(checkInAt, checkOutAt, totalBreakMinutes)
    : null;
  const earlyExitMinutes = checkOutAt
    ? computeEarlyExitMinutes(checkOutAt, existing.attendanceDate, shiftTiming, timezone)
    : 0;
  const overtimeMinutes =
    workingMinutes !== null
      ? computeOvertimeMinutes(workingMinutes, existing.attendanceDate, shiftTiming, timezone)
      : 0;
  const status =
    workingMinutes !== null
      ? determinePunchStatus(lateMinutes, workingMinutes, shiftTiming.halfDayThresholdMin)
      : existing.status;

  const updated = await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      checkInAt,
      checkOutAt,
      lateMinutes,
      workingMinutes,
      earlyExitMinutes,
      overtimeMinutes,
      status,
      isAutoClosed: false,
      flaggedForReview: false,
      correctedByUserId: actor.userId,
      correctionReason: input.reason,
      correctionBeforeJson: {
        checkInAt: existing.checkInAt?.toISOString() ?? null,
        checkOutAt: existing.checkOutAt?.toISOString() ?? null,
        workingMinutes: existing.workingMinutes,
        lateMinutes: existing.lateMinutes,
        earlyExitMinutes: existing.earlyExitMinutes,
        overtimeMinutes: existing.overtimeMinutes,
        status: existing.status,
      },
    },
  });

  await recordAudit({
    actorUserId: actor.userId,
    action: "attendance.corrected",
    targetEntity: "attendance",
    targetId: attendanceId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    before: updated.correctionBeforeJson as Prisma.InputJsonValue,
    after: {
      checkInAt: updated.checkInAt?.toISOString() ?? null,
      checkOutAt: updated.checkOutAt?.toISOString() ?? null,
      workingMinutes: updated.workingMinutes,
      lateMinutes: updated.lateMinutes,
      earlyExitMinutes: updated.earlyExitMinutes,
      overtimeMinutes: updated.overtimeMinutes,
      status: updated.status,
    },
    metadata: { reason: input.reason },
  });

  return updated;
}

export async function deleteBreak(breakId: string, actor: SessionContext) {
  requirePermission(actor, "attendance.correct");

  const brk = await prisma.break.findUnique({
    where: { id: breakId },
    include: { attendance: { include: { shift: true } } },
  });
  if (!brk) throw new NotFoundError("Break record not found");

  const attendance = brk.attendance;
  const attendanceId = brk.attendanceId;

  // Delete the break
  await prisma.break.delete({
    where: { id: breakId },
  });

  // Recalculate breakMinutes
  const breakAgg = await prisma.break.aggregate({
    where: { attendanceId },
    _sum: { durationMin: true },
  });
  const totalBreakMinutes = breakAgg._sum.durationMin ?? 0;

  const timezone = await getCompanyTimezone();
  const shiftTiming = toShiftTiming(attendance.shift);

  const checkInAt = attendance.checkInAt;
  const checkOutAt = attendance.checkOutAt;

  if (checkInAt) {
    const lateMinutes = computeLateMinutes(checkInAt, attendance.attendanceDate, shiftTiming, timezone);
    const workingMinutes = checkOutAt
      ? computeWorkingMinutes(checkInAt, checkOutAt, totalBreakMinutes)
      : null;
    const earlyExitMinutes = checkOutAt
      ? computeEarlyExitMinutes(checkOutAt, attendance.attendanceDate, shiftTiming, timezone)
      : 0;
    const overtimeMinutes =
      workingMinutes !== null
        ? computeOvertimeMinutes(workingMinutes, attendance.attendanceDate, shiftTiming, timezone)
        : 0;
    const status =
      workingMinutes !== null
        ? determinePunchStatus(lateMinutes, workingMinutes, shiftTiming.halfDayThresholdMin)
        : attendance.status;

    await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        breakMinutes: totalBreakMinutes,
        workingMinutes,
        lateMinutes,
        earlyExitMinutes,
        overtimeMinutes,
        status,
      },
    });
  } else {
    await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        breakMinutes: totalBreakMinutes,
      },
    });
  }
}

export async function toggleWeeklyOff(
  employeeId: string,
  dateStr: string,
  actor: SessionContext,
  meta: RequestMeta = {},
) {
  requirePermission(actor, "attendance.correct");

  const timezone = await getCompanyTimezone();
  // Ensure we store it as a UTC Date at midnight matching the format of prisma @db.Date
  const localDate = DateTime.fromISO(dateStr, { zone: timezone }).startOf("day");
  const date = DateTime.utc(localDate.year, localDate.month, localDate.day).toJSDate();

  const existing = await prisma.attendance.findUnique({
    where: {
      employeeId_attendanceDate: {
        employeeId,
        attendanceDate: date,
      },
    },
  });

  if (existing) {
    if (existing.status === "WEEKLY_OFF") {
      // If it is already marked as weekly off, delete it so it reverts to dynamic absent/default calculation
      await prisma.attendance.delete({
        where: { id: existing.id },
      });
      await recordAudit({
        actorUserId: actor.userId,
        action: "attendance.weekly_off_removed",
        targetEntity: "attendance",
        targetId: existing.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
        metadata: { date: dateStr },
      });
    } else {
      // If it's another status, overwrite it to WEEKLY_OFF and clear check in/out
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: "WEEKLY_OFF",
          checkInAt: null,
          checkOutAt: null,
          workingMinutes: null,
          breakMinutes: null,
          lateMinutes: 0,
          overtimeMinutes: 0,
          earlyExitMinutes: 0,
        },
      });
      await recordAudit({
        actorUserId: actor.userId,
        action: "attendance.marked_weekly_off",
        targetEntity: "attendance",
        targetId: updated.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
        metadata: { date: dateStr },
      });
    }
  } else {
    // Get employee shift
    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id: employeeId },
      select: { shiftId: true },
    });
    if (!employee.shiftId) {
      throw new Error("Employee has no shift assigned");
    }

    const created = await prisma.attendance.create({
      data: {
        employeeId,
        attendanceDate: date,
        shiftId: employee.shiftId,
        status: "WEEKLY_OFF",
      },
    });

    await recordAudit({
      actorUserId: actor.userId,
      action: "attendance.marked_weekly_off",
      targetEntity: "attendance",
      targetId: created.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { date: dateStr },
    });
  }
}

