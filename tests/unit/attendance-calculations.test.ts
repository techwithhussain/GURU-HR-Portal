import { describe, expect, it } from "vitest";
import {
  attendanceDateForCheckIn,
  computeEarlyExitMinutes,
  computeLateMinutes,
  computeOvertimeMinutes,
  computeWorkingMinutes,
  determinePunchStatus,
  isNightShift,
  type ShiftTiming,
} from "@/lib/attendance/calculations";

const TZ = "Asia/Kolkata";

const dayShift: ShiftTiming = {
  startMinutesOfDay: 9 * 60, // 09:00
  endMinutesOfDay: 18 * 60, // 18:00
  gracePeriodMin: 10,
  halfDayThresholdMin: 240, // 4h
  overtimeRule: { thresholdMin: 15, roundingMin: 15 },
};

const nightShift: ShiftTiming = {
  startMinutesOfDay: 22 * 60, // 22:00
  endMinutesOfDay: 6 * 60 + 10, // 06:10 next day
  gracePeriodMin: 10,
  halfDayThresholdMin: 240,
  overtimeRule: { thresholdMin: 15, roundingMin: 15 },
};

function istInstant(iso: string): Date {
  // iso like "2026-07-07T09:05:00" interpreted as Asia/Kolkata local time
  return new Date(`${iso}+05:30`);
}

describe("isNightShift", () => {
  it("detects a shift whose end is before its start as crossing midnight", () => {
    expect(isNightShift(nightShift)).toBe(true);
    expect(isNightShift(dayShift)).toBe(false);
  });
});

describe("attendanceDateForCheckIn", () => {
  it("attributes a night-shift check-in to its own calendar day", () => {
    const checkIn = istInstant("2026-07-07T22:00:00");
    const attendanceDate = attendanceDateForCheckIn(checkIn, TZ);
    // The stored value is the UTC instant of 2026-07-07 00:00 IST, which is
    // 2026-07-06T18:30:00Z — the ISO date component date-shifts because of the
    // +05:30 offset, but re-reading it with setZone(TZ) yields local midnight
    // of 2026-07-07 again (exercised indirectly via the night-shift tests below).
    expect(attendanceDate.toISOString().slice(0, 10)).toBe("2026-07-06");
  });
});

describe("computeLateMinutes", () => {
  it("is zero when checking in within the grace period", () => {
    const attendanceDate = attendanceDateForCheckIn(istInstant("2026-07-07T09:05:00"), TZ);
    const late = computeLateMinutes(istInstant("2026-07-07T09:05:00"), attendanceDate, dayShift, TZ);
    expect(late).toBe(0);
  });

  it("is positive when checking in after shift start + grace period", () => {
    const attendanceDate = attendanceDateForCheckIn(istInstant("2026-07-07T09:25:00"), TZ);
    const late = computeLateMinutes(istInstant("2026-07-07T09:25:00"), attendanceDate, dayShift, TZ);
    expect(late).toBe(15); // 25 min after start - 10 min grace
  });
});

describe("night shift crossing midnight", () => {
  it("computes correct working hours and zero early-exit for a full night shift", () => {
    const checkIn = istInstant("2026-07-07T22:00:00");
    const checkOut = istInstant("2026-07-08T06:10:00");
    const attendanceDate = attendanceDateForCheckIn(checkIn, TZ);

    const workingMinutes = computeWorkingMinutes(checkIn, checkOut, 30);
    expect(workingMinutes).toBe(8 * 60 + 10 - 30); // 8h10m shift minus 30 min break

    const earlyExit = computeEarlyExitMinutes(checkOut, attendanceDate, nightShift, TZ);
    expect(earlyExit).toBe(0);

    const late = computeLateMinutes(checkIn, attendanceDate, nightShift, TZ);
    expect(late).toBe(0);
  });

  it("flags early exit when checking out before the shift's scheduled end next day", () => {
    const checkIn = istInstant("2026-07-07T22:00:00");
    const checkOut = istInstant("2026-07-08T05:00:00");
    const attendanceDate = attendanceDateForCheckIn(checkIn, TZ);

    const earlyExit = computeEarlyExitMinutes(checkOut, attendanceDate, nightShift, TZ);
    expect(earlyExit).toBe(70); // 06:10 - 05:00
  });
});

describe("computeOvertimeMinutes", () => {
  it("is zero when working within scheduled hours plus threshold", () => {
    const attendanceDate = attendanceDateForCheckIn(istInstant("2026-07-07T09:00:00"), TZ);
    const overtime = computeOvertimeMinutes(9 * 60, attendanceDate, dayShift, TZ);
    expect(overtime).toBe(0);
  });

  it("rounds down overtime to the configured rounding increment", () => {
    const attendanceDate = attendanceDateForCheckIn(istInstant("2026-07-07T09:00:00"), TZ);
    // scheduled = 9h (540m), threshold = 15m -> overtime kicks in above 555m worked
    const overtime = computeOvertimeMinutes(540 + 15 + 22, attendanceDate, dayShift, TZ);
    expect(overtime).toBe(15); // 22 raw minutes over threshold, floored to nearest 15
  });
});

describe("determinePunchStatus", () => {
  it("prioritizes HALF_DAY over LATE when both conditions hold", () => {
    expect(determinePunchStatus(20, 100, 240)).toBe("HALF_DAY");
  });

  it("returns LATE when late but working a full day", () => {
    expect(determinePunchStatus(20, 480, 240)).toBe("LATE");
  });

  it("returns PRESENT when on time and working a full day", () => {
    expect(determinePunchStatus(0, 480, 240)).toBe("PRESENT");
  });
});
