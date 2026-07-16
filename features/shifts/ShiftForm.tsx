"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createShiftAction, updateShiftAction } from "@/actions/shift.actions";
import type { Shift } from "@/lib/prisma-client/client";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// A shift "crosses midnight" when its end-of-day minute isn't after its start
// (e.g. 21:00 -> 06:00) — total duration then wraps through 24:00.
function totalDurationMinutes(startMinutesOfDay: number, endMinutesOfDay: number): number {
  const raw = endMinutesOfDay - startMinutesOfDay;
  return raw > 0 ? raw : raw + 24 * 60;
}

function readOvertimeRule(value: unknown): { thresholdMin: number; roundingMin: number } {
  if (value && typeof value === "object" && "thresholdMin" in value && "roundingMin" in value) {
    const rule = value as { thresholdMin: unknown; roundingMin: unknown };
    return {
      thresholdMin: Number(rule.thresholdMin) || 0,
      roundingMin: Number(rule.roundingMin) || 1,
    };
  }
  return { thresholdMin: 480, roundingMin: 15 };
}

function readWeeklyOff(value: unknown): number[] {
  if (Array.isArray(value)) return value.map(Number).filter((n) => n >= 0 && n <= 6);
  return [];
}

export function ShiftForm({ mode, shift }: { mode: "create" | "edit"; shift?: Shift }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const overtimeRule = readOvertimeRule(shift?.overtimeRule);
  const [weeklyOff, setWeeklyOff] = useState<number[]>(readWeeklyOff(shift?.weeklyOff));
  const [startTime, setStartTime] = useState(shift ? minutesToTime(shift.startMinutesOfDay) : "10:00");
  const [endTime, setEndTime] = useState(shift ? minutesToTime(shift.endMinutesOfDay) : "19:00");
  const [breakAllowanceMin, setBreakAllowanceMin] = useState(
    shift?.breakAllowanceMin != null ? String(shift.breakAllowanceMin) : "60",
  );

  const totalMin = totalDurationMinutes(timeToMinutes(startTime), timeToMinutes(endTime));
  const breakMin = Number(breakAllowanceMin) || 0;
  const netMin = Math.max(0, totalMin - breakMin);
  const crossesMidnight = timeToMinutes(endTime) <= timeToMinutes(startTime);

  function toggleWeeklyOff(day: number) {
    setWeeklyOff((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function handleSubmit(formData: FormData) {
    const payload = {
      name: String(formData.get("name") ?? ""),
      startMinutesOfDay: timeToMinutes(String(formData.get("startTime"))),
      endMinutesOfDay: timeToMinutes(String(formData.get("endTime"))),
      gracePeriodMin: Number(formData.get("gracePeriodMin")),
      halfDayThresholdMin: Number(formData.get("halfDayThresholdMin")),
      breakAllowanceMin: formData.get("breakAllowanceMin")
        ? Number(formData.get("breakAllowanceMin"))
        : undefined,
      overtimeRule: {
        thresholdMin: Number(formData.get("otThresholdMin")),
        roundingMin: Number(formData.get("otRoundingMin")),
      },
      weeklyOff,
    };

    setError(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createShiftAction(payload)
          : await updateShiftAction(shift!.id, payload);

      if (!result.success) {
        setError(result.error ?? "Something went wrong");
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      toast.success(mode === "create" ? "Shift created" : "Shift updated");
      router.push("/admin/shifts");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="grid max-w-xl gap-4">
      <div className="space-y-2">
        <Label htmlFor="name">Shift name</Label>
        <Input id="name" name="name" defaultValue={shift?.name} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start time</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End time</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>

      <Card className="rounded-xl border-0 bg-muted/40 shadow-none">
        <CardContent className="grid grid-cols-3 gap-4 py-4 text-center">
          <div>
            <p className="text-lg font-semibold">{formatDuration(totalMin)}</p>
            <p className="text-xs text-muted-foreground">Total Duration</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{formatDuration(breakMin)}</p>
            <p className="text-xs text-muted-foreground">Break Allowance</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-primary">{formatDuration(netMin)}</p>
            <p className="text-xs text-muted-foreground">Net Working Hours</p>
          </div>
          {crossesMidnight && (
            <p className="col-span-3 text-xs text-muted-foreground">
              This shift crosses midnight — attendance for a login on day N ends on day N+1.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gracePeriodMin">Grace period (min)</Label>
          <Input
            id="gracePeriodMin"
            name="gracePeriodMin"
            type="number"
            min="0"
            defaultValue={shift?.gracePeriodMin ?? 0}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="halfDayThresholdMin">Half-day threshold (min)</Label>
          <Input
            id="halfDayThresholdMin"
            name="halfDayThresholdMin"
            type="number"
            min="1"
            defaultValue={shift?.halfDayThresholdMin ?? 240}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="otThresholdMin">Overtime threshold (min)</Label>
          <Input
            id="otThresholdMin"
            name="otThresholdMin"
            type="number"
            min="0"
            defaultValue={overtimeRule.thresholdMin}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="otRoundingMin">Overtime rounding (min)</Label>
          <Input
            id="otRoundingMin"
            name="otRoundingMin"
            type="number"
            min="1"
            defaultValue={overtimeRule.roundingMin}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="breakAllowanceMin">Break allowance (min)</Label>
        <Input
          id="breakAllowanceMin"
          name="breakAllowanceMin"
          type="number"
          min="0"
          value={breakAllowanceMin}
          onChange={(e) => setBreakAllowanceMin(e.target.value)}
          placeholder="Leave blank for no cap"
        />
        <p className="text-xs text-muted-foreground">
          Total break time an employee may take per day on this shift. Once used up, they can&apos;t
          start another break until the next working day.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Weekly off</Label>
        <div className="flex flex-wrap gap-3">
          {WEEKDAY_LABELS.map((label, day) => (
            <label key={day} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={weeklyOff.includes(day)}
                onChange={() => toggleWeeklyOff(day)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving..." : mode === "create" ? "Create shift" : "Save changes"}
      </Button>
    </form>
  );
}
