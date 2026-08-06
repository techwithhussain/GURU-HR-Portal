"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMyAttendanceCalendarAction, getBirthdayCalendarAction } from "@/actions/dashboard.actions";
import type { MyCalendarDay } from "@/services/dashboardService";
import type { MonthBirthday } from "@/services/birthdayService";

const STATUS_STYLE: Record<string, { cell: string; dot: string }> = {
  PRESENT: { cell: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  LATE: { cell: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  HALF_DAY: { cell: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  ABSENT: { cell: "bg-red-50 text-red-700", dot: "bg-red-500" },
  ON_LEAVE: { cell: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  WEEKLY_OFF: { cell: "text-muted-foreground/50", dot: "bg-muted-foreground/40" },
  HOLIDAY: { cell: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
};

const LEGEND: { key: string; label: string }[] = [
  { key: "PRESENT", label: "Present" },
  { key: "LATE", label: "Late" },
  { key: "ABSENT", label: "Absent" },
  { key: "ON_LEAVE", label: "Leave" },
  { key: "HOLIDAY", label: "Holiday" },
];

export function AttendanceCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [days, setDays] = useState<MyCalendarDay[]>([]);
  const [birthdays, setBirthdays] = useState<MonthBirthday[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const [attendanceResult, birthdayResult] = await Promise.all([
        getMyAttendanceCalendarAction(year, month),
        getBirthdayCalendarAction(year, month),
      ]);
      setDays(attendanceResult);
      setBirthdays(birthdayResult);
    });
  }, [year, month]);

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  // Build a map: day → birthday names for tooltip
  const birthdayMap = new Map<number, string[]>();
  for (const b of birthdays) {
    const names = birthdayMap.get(b.day) ?? [];
    names.push(b.fullName);
    birthdayMap.set(b.day, names);
  }

  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <CalendarRange className="size-4 text-brand-blue" />
          {monthLabel}
        </CardTitle>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-full border-border/70 shadow-none"
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-full border-border/70 shadow-none"
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="mx-auto w-full max-w-[220px] sm:max-w-[250px] md:max-w-[270px] lg:max-w-[290px]">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="py-0.5">{d}</div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.map((day) => {
              const dayNum = Number(day.date.slice(-2));
              const isToday = day.date === todayKey;
              const style = day.status ? STATUS_STYLE[day.status] : undefined;
              const bdNames = birthdayMap.get(dayNum);
              const hasBirthday = !!bdNames && bdNames.length > 0;
              const tooltipTitle = hasBirthday
                ? `🎂 ${bdNames!.join(", ")}`
                : undefined;

              return (
                <div
                  key={day.date}
                  title={tooltipTitle}
                  className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-xs transition-colors ${
                    isToday
                      ? "bg-gradient-to-br from-brand-orange to-brand-orange-light font-bold text-white shadow-soft"
                      : hasBirthday
                      ? `${style?.cell ?? "bg-pink-50 text-pink-700"} font-medium ring-1 ring-pink-300/50`
                      : `${style?.cell ?? "text-foreground hover:bg-muted"} font-medium`
                  }`}
                >
                  <span>{dayNum}</span>
                  {!isToday && (
                    <span className="flex items-center gap-0.5">
                      {day.status && (
                        <span className={`size-1 rounded-full ${style?.dot}`} />
                      )}
                      {hasBirthday && (
                        <span className="text-[7px] leading-none">🎂</span>
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {isPending && <p className="mt-2 text-center text-xs text-muted-foreground">Loading…</p>}
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
            {LEGEND.map((l) => (
              <span
                key={l.key}
                className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                <span className={`size-1.5 rounded-full ${STATUS_STYLE[l.key]?.dot}`} />
                {l.label}
              </span>
            ))}
            {/* Birthday legend */}
            <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <span className="text-[9px] leading-none">🎂</span>
              Birthday
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
