import "server-only";
import { Prisma } from "@/lib/generated/prisma/client";
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
  type ShiftTiming,
} from "@/lib/attendance/calculations";
import type { CorrectAttendanceInput } from "@/lib/validation/attendance";
import { notifyUsers } from "@/services/notificationService";

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
  const attendanceDate = attendanceDateForCheckIn(now, timezone);
  const shiftTiming = toShiftTiming(employee.shift);

  // Status at check-in only reflects lateness — HALF_DAY is only meaningful
  // once working minutes are known at checkout, so determinePunchStatus (which
  // would spuriously read 0 worked minutes as HALF_DAY) isn't used here.
  const lateMinutes = computeLateMinutes(now, attendanceDate, shiftTiming, timezone);

  // An approved leave already owns this calendar day (it pre-creates an
  // ON_LEAVE placeholder row) — block here with a clear message instead of
  // silently falling through to the P2002 branch below, which would return
  // that placeholder as-is (checkInAt never set, status stuck on ON_LEAVE).
  const approvedLeaveToday = await prisma.leave.findFirst({
    where: { employeeId, status: "APPROVED", startDate: { lte: attendanceDate }, endDate: { gte: attendanceDate } },
  });
  if (approvedLeaveToday) {
    throw new ConflictError(
      "You have an approved leave for today. Ask Admin to cancel it first if you need to check in.",
    );
  }

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
            subject: `Late check-in — ${employeeWithManager.fullName}`,
            text: `${employeeWithManager.fullName} checked in ${lateMinutes} minute(s) late today.`,
          },
        );
      }
    }

    return attendance;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Idempotent: a check-in already exists for this employee/day — return it.
      const existing = await prisma.attendance.findUnique({
        where: { employeeId_attendanceDate: { employeeId, attendanceDate } },
      });
      if (existing) return existing;
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
    throw new ConflictError("No active check-in found");
  }

  const activeBreak = await prisma.break.findFirst({
    where: { attendanceId: openAttendance.id, endAt: null },
  });
  if (activeBreak) {
    throw new ConflictError("End your active break before checking out");
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
  if (!attendance) throw new ConflictError("Check in before managing breaks");
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

  const existingOpenBreak = await prisma.break.findFirst({
    where: { attendanceId: attendance.id, endAt: null },
  });
  if (existingOpenBreak) throw new ConflictError("A break is already active");

  const shift = await prisma.shift.findUnique({
    where: { id: attendance.shiftId },
    select: { breakAllowanceMin: true },
  });
  if (shift?.breakAllowanceMin != null) {
    const breakAgg = await prisma.break.aggregate({
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

  try {
    const brk = await prisma.break.create({
      data: {
        attendanceId: attendance.id,
        type: type as Prisma.BreakCreateInput["type"],
        startAt: new Date(),
      },
    });

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

  return updated;
}

export async function getCurrentStatus(employeeId: string) {
  const timezone = await getCompanyTimezone();
  const today = attendanceDateForCheckIn(new Date(), timezone);

  const [openAttendance, todayAttendance] = await Promise.all([
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

  const current = openAttendance ?? todayAttendance;
  if (!current) return { state: "NOT_CHECKED_IN" as const };

  const activeBreak = current.breaks.find((b) => !b.endAt);
  if (activeBreak) return { state: "ON_BREAK" as const, attendance: current, activeBreak };
  if (!current.checkOutAt) return { state: "CHECKED_IN" as const, attendance: current };
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

  return breaks.map((b) => ({
    breakId: b.id,
    type: b.type,
    startAt: b.startAt,
    employeeId: b.attendance.employee.id,
    employeeName: b.attendance.employee.fullName,
    department: b.attendance.employee.department?.name ?? null,
    profileImageUrl: b.attendance.employee.profileImageUrl,
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
          subject: `Missed checkout — ${employee.fullName}`,
          text: `${employee.fullName} did not check out on ${dateStr}. The system auto-closed that day's attendance at shift end.`,
        },
      );
    }

    closedCount++;
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

  const checkInAt = input.checkInAt ?? existing.checkInAt;
  const checkOutAt = input.checkOutAt ?? existing.checkOutAt;
  if (!checkInAt) throw new ConflictError("A check-in time is required");

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
