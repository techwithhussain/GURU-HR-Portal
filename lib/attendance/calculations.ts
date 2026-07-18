import { DateTime } from "luxon";

export interface ShiftTiming {
  startMinutesOfDay: number; // minutes since local midnight, 0-1439
  endMinutesOfDay: number; // minutes since local midnight, 0-1439
  gracePeriodMin: number;
  halfDayThresholdMin: number;
  overtimeRule: { thresholdMin: number; roundingMin: number };
}

/** A shift "crosses midnight" when its end-of-day minute is not after its start. */
export function isNightShift(shift: Pick<ShiftTiming, "startMinutesOfDay" | "endMinutesOfDay">): boolean {
  return shift.endMinutesOfDay <= shift.startMinutesOfDay;
}

/**
 * The attendance day a punch belongs to.
 *
 * For **day shifts** this is simply the check-in's own local calendar date.
 *
 * For **night shifts** (shift end <= shift start, e.g. 8:30 PM – 6:00 AM) the
 * same calendar date is used when the employee clocks in during the PM portion.
 * However, if the employee clocks in during the early-morning portion — after
 * midnight but still before the shift ends — the attendance date must be the
 * *previous* calendar day (the day the shift actually started), otherwise:
 *
 *   • `shiftEndInstant` is computed against the wrong base date and fires
 *     24 hours too late (next-day 6 AM instead of this-morning 6 AM).
 *   • `computeLateMinutes` returns 0 because (1 AM) − (8:30 PM tomorrow) < 0.
 *   • `autoCloseStaleAttendance` misses the record for a full extra day.
 *
 * When `shift` is omitted the function falls back to the plain calendar-date
 * behaviour (used by dashboard/reporting callers that only need a date bucket
 * and don't have shift context).
 */
export function attendanceDateForCheckIn(
  checkInAt: Date,
  timezone: string,
  shift?: Pick<ShiftTiming, "startMinutesOfDay" | "endMinutesOfDay">,
): Date {
  const local = DateTime.fromJSDate(checkInAt, { zone: "utc" }).setZone(timezone);

  if (shift && isNightShift(shift)) {
    // Minutes elapsed since local midnight for the check-in instant.
    const minutesOfDay = local.hour * 60 + local.minute;
    // If we're in the early-morning "tail" of the night shift (i.e. after
    // midnight but before the scheduled end), this punch belongs to
    // yesterday's shift date — subtract one calendar day.
    if (minutesOfDay < shift.endMinutesOfDay) {
      const yesterday = local.minus({ days: 1 });
      return DateTime.utc(yesterday.year, yesterday.month, yesterday.day).toJSDate();
    }
  }

  // Store the local calendar date's own numbers as UTC midnight — never convert
  // the local-midnight *instant* to UTC, since for positive offsets (e.g.
  // Asia/Kolkata) that instant falls on the previous UTC calendar day, which
  // would silently truncate into the wrong date once written to a @db.Date column.
  return DateTime.utc(local.year, local.month, local.day).toJSDate();
}


function shiftBoundaryInstant(
  attendanceDate: Date,
  minutesOfDay: number,
  timezone: string,
  crossesToNextDay: boolean,
): DateTime {
  const localMidnight = DateTime.fromJSDate(attendanceDate, { zone: "utc" })
    .setZone(timezone)
    .startOf("day");
  const withTime = localMidnight.plus({ minutes: minutesOfDay });
  return crossesToNextDay ? withTime.plus({ days: 1 }) : withTime;
}

export function shiftStartInstant(attendanceDate: Date, shift: ShiftTiming, timezone: string): DateTime {
  return shiftBoundaryInstant(attendanceDate, shift.startMinutesOfDay, timezone, false);
}

export function shiftEndInstant(attendanceDate: Date, shift: ShiftTiming, timezone: string): DateTime {
  return shiftBoundaryInstant(attendanceDate, shift.endMinutesOfDay, timezone, isNightShift(shift));
}

export function computeLateMinutes(
  checkInAt: Date,
  attendanceDate: Date,
  shift: ShiftTiming,
  timezone: string,
): number {
  const threshold = shiftStartInstant(attendanceDate, shift, timezone).plus({
    minutes: shift.gracePeriodMin,
  });
  const diff = DateTime.fromJSDate(checkInAt, { zone: "utc" }).diff(threshold, "minutes").minutes;
  return diff > 0 ? Math.round(diff) : 0;
}

export function computeEarlyExitMinutes(
  checkOutAt: Date,
  attendanceDate: Date,
  shift: ShiftTiming,
  timezone: string,
): number {
  const end = shiftEndInstant(attendanceDate, shift, timezone);
  const diff = end.diff(DateTime.fromJSDate(checkOutAt, { zone: "utc" }), "minutes").minutes;
  return diff > 0 ? Math.round(diff) : 0;
}

export function computeWorkingMinutes(checkInAt: Date, checkOutAt: Date, totalBreakMinutes: number): number {
  const minutes = DateTime.fromJSDate(checkOutAt, { zone: "utc" }).diff(
    DateTime.fromJSDate(checkInAt, { zone: "utc" }),
    "minutes",
  ).minutes;
  return Math.max(0, Math.round(minutes) - totalBreakMinutes);
}

export function computeOvertimeMinutes(
  workingMinutes: number,
  attendanceDate: Date,
  shift: ShiftTiming,
  timezone: string,
): number {
  const start = shiftStartInstant(attendanceDate, shift, timezone);
  const end = shiftEndInstant(attendanceDate, shift, timezone);
  const scheduledMinutes = end.diff(start, "minutes").minutes;
  const rawOvertime = workingMinutes - scheduledMinutes - shift.overtimeRule.thresholdMin;
  if (rawOvertime <= 0) return 0;
  const rounding = shift.overtimeRule.roundingMin || 1;
  return Math.floor(rawOvertime / rounding) * rounding;
}

export function determinePunchStatus(
  lateMinutes: number,
  workingMinutes: number,
  halfDayThresholdMin: number,
): "LATE" | "HALF_DAY" | "PRESENT" {
  if (workingMinutes < halfDayThresholdMin) return "HALF_DAY";
  if (lateMinutes > 0) return "LATE";
  return "PRESENT";
}
