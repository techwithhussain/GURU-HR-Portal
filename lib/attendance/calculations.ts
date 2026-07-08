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
 * The attendance day a punch belongs to is always the check-in's own local
 * calendar date — this is what keeps a night shift's hours attributed to the
 * day it started, since check-out (after midnight) never changes it.
 */
export function attendanceDateForCheckIn(checkInAt: Date, timezone: string): Date {
  return DateTime.fromJSDate(checkInAt, { zone: "utc" })
    .setZone(timezone)
    .startOf("day")
    .toUTC()
    .toJSDate();
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
