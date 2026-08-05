"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, CalendarRange, UserCheck, UserX, Clock, CalendarCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminAttendanceCalendarAction } from "@/actions/dashboard.actions";
import type { AdminCalendarDay } from "@/services/dashboardService";

export function AdminAttendanceCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [days, setDays] = useState<AdminCalendarDay[]>([]);
  const [hoveredDay, setHoveredDay] = useState<AdminCalendarDay | null>(null);
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
    <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-muted/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <CalendarRange className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">
              {monthLabel} — Attendance Overview
            </CardTitle>
            <p className="text-xs text-muted-foreground">Monthly breakdown of company-wide attendance</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            className="size-8 rounded-lg border-border/80 bg-background shadow-xs hover:bg-muted"
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="size-8 rounded-lg border-border/80 bg-background shadow-xs hover:bg-muted"
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid grid-cols-7 gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="pb-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {d}
            </div>
          ))}

          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[84px] rounded-xl bg-muted/10 border border-transparent" />
          ))}

          {days.map((day) => {
            const dayNum = Number(day.date.slice(-2));
            const isToday = day.date === todayKey;
            const totalPresent = day.presentCount + day.lateCount + day.halfDayCount;
            const totalTracked = totalPresent + day.absentCount + day.upcomingCount;

            const presentPct = totalTracked > 0 ? (totalPresent / totalTracked) * 100 : 0;
            const absentPct = totalTracked > 0 ? (day.absentCount / totalTracked) * 100 : 0;
            const upcomingPct = totalTracked > 0 ? (day.upcomingCount / totalTracked) * 100 : 0;

            return (
              <div
                key={day.date}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`group relative flex min-h-[84px] flex-col justify-between rounded-xl border p-2.5 transition-all duration-200 ${
                  isToday
                    ? "border-brand-orange bg-gradient-to-b from-brand-orange/10 via-brand-orange/5 to-transparent shadow-md ring-2 ring-brand-orange/20"
                    : day.isHoliday
                    ? "border-blue-200 bg-blue-50/50 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/20"
                    : day.isFuture
                    ? "border-border/30 bg-muted/10 opacity-40"
                    : "border-border/60 bg-background hover:border-border hover:shadow-xs"
                }`}
              >
                {/* Header row in cell: Date Number & Badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`flex size-6 items-center justify-center rounded-md text-xs font-bold ${
                      isToday
                        ? "bg-brand-orange text-white shadow-xs"
                        : "text-foreground group-hover:text-brand-orange"
                    }`}
                  >
                    {dayNum}
                  </span>

                  {day.isHoliday && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      Holiday
                    </span>
                  )}

                  {isToday && (
                    <span className="rounded-full bg-brand-orange/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-orange">
                      Today
                    </span>
                  )}
                </div>

                {/* Body row in cell: Visual Progress Bar & Pills */}
                {!day.isHoliday && !day.isFuture && (
                  <div className="mt-2 space-y-1.5">
                    {/* Multi-segment Progress Bar */}
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                      {presentPct > 0 && (
                        <div
                          style={{ width: `${presentPct}%` }}
                          className="bg-emerald-500 transition-all duration-300"
                          title={`Present: ${totalPresent}`}
                        />
                      )}
                      {absentPct > 0 && (
                        <div
                          style={{ width: `${absentPct}%` }}
                          className="bg-rose-500 transition-all duration-300"
                          title={`Absent: ${day.absentCount}`}
                        />
                      )}
                      {upcomingPct > 0 && (
                        <div
                          style={{ width: `${upcomingPct}%` }}
                          className="bg-amber-400 transition-all duration-300"
                          title={`Upcoming: ${day.upcomingCount}`}
                        />
                      )}
                    </div>

                    {/* Count Badges / Pills */}
                    <div className="flex items-center justify-between gap-1 text-[10px] font-medium">
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <span className="size-1 rounded-full bg-emerald-500" />
                        {totalPresent}
                      </span>

                      <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                        <span className="size-1 rounded-full bg-rose-500" />
                        {day.absentCount}
                      </span>

                      {day.upcomingCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          <span className="size-1 rounded-full bg-amber-400" />
                          {day.upcomingCount}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isPending && <p className="mt-3 text-center text-xs text-muted-foreground">Loading calendar data...</p>}

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/50 bg-muted/20 p-3.5 text-xs">
          <div className="flex flex-wrap items-center gap-4 font-medium">
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <span className="size-2.5 rounded-full bg-emerald-500 shadow-xs" />
              P = Present / Late
            </span>
            <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
              <span className="size-2.5 rounded-full bg-rose-500 shadow-xs" />
              A = Absent
            </span>
            <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <span className="size-2.5 rounded-full bg-amber-400 shadow-xs" />
              U = Upcoming (Shift Not Started)
            </span>
            <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
              <span className="size-2.5 rounded-full bg-blue-500 shadow-xs" />
              Holiday
            </span>
          </div>

          {hoveredDay && !hoveredDay.isFuture && !hoveredDay.isHoliday && (
            <div className="animate-in fade-in flex items-center gap-3 font-semibold text-foreground">
              <span>{hoveredDay.date}:</span>
              <span className="text-emerald-600">
                P: {hoveredDay.presentCount + hoveredDay.lateCount + hoveredDay.halfDayCount}
              </span>
              <span className="text-rose-600">A: {hoveredDay.absentCount}</span>
              {hoveredDay.upcomingCount > 0 && <span className="text-amber-600">U: {hoveredDay.upcomingCount}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
