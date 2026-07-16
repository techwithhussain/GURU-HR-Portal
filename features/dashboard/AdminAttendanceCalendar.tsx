"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminAttendanceCalendarAction } from "@/actions/dashboard.actions";
import type { AdminCalendarDay } from "@/services/dashboardService";

export function AdminAttendanceCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [days, setDays] = useState<AdminCalendarDay[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getAdminAttendanceCalendarAction(year, month);
      setDays(result);
    });
  }, [year, month]);

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <CalendarRange className="size-4 text-brand-blue" />
          {monthLabel} — Company Attendance
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
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-0.5">
              {d}
            </div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map((day) => {
            const dayNum = Number(day.date.slice(-2));
            const isToday = day.date === todayKey;
            return (
              <div
                key={day.date}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-lg text-xs transition-colors ${
                  isToday
                    ? "bg-gradient-to-br from-brand-orange to-brand-orange-light font-bold text-white shadow-soft"
                    : day.isHoliday
                      ? "bg-blue-50 text-blue-700"
                      : "bg-muted/40 text-foreground"
                } ${day.isFuture && !isToday ? "opacity-40" : ""}`}
              >
                <span className="font-semibold">{dayNum}</span>
                {day.isHoliday ? (
                  <span className={`text-[10px] ${isToday ? "text-white/80" : "text-blue-600"}`}>Holiday</span>
                ) : day.isFuture ? null : (
                  <span className="flex items-center gap-1.5 text-[10px]">
                    <span className={isToday ? "text-white" : "text-emerald-600"}>
                      P {day.presentCount + day.lateCount + day.halfDayCount}
                    </span>
                    <span className={isToday ? "text-white" : "text-red-600"}>A {day.absentCount}</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {isPending && <p className="mt-2 text-center text-xs text-muted-foreground">Loading…</p>}
        <div className="mt-4 flex flex-wrap gap-3 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" /> P = Present/Late
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-red-500" /> A = Absent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-blue-500" /> Holiday
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
