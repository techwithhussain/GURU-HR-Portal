"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getLeaveCalendarAction } from "@/actions/leave.actions";
import type { LeaveCalendarEvent, LeaveCalendarHoliday } from "@/services/leaveService";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function LeaveCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [events, setEvents] = useState<LeaveCalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<LeaveCalendarHoliday[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getLeaveCalendarAction(year, month);
      setEvents(result.events);
      setHolidays(result.holidays);
    });
  }, [year, month]);

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  function eventsOnDay(dateKey: string): LeaveCalendarEvent[] {
    return events.filter((e) => e.startDate <= dateKey && e.endDate >= dateKey);
  }

  function holidayOnDay(dateKey: string): LeaveCalendarHoliday | undefined {
    return holidays.find((h) => h.date === dateKey);
  }

  const selectedEvents = selectedDate ? eventsOnDay(selectedDate) : [];
  const selectedHoliday = selectedDate ? holidayOnDay(selectedDate) : undefined;

  return (
    <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <CalendarRange className="size-4 text-brand-blue" />
          {monthLabel}
        </CardTitle>
        <div className="flex gap-1.5">
          <Button variant="outline" size="icon-sm" className="rounded-full border-border/70 shadow-none" onClick={() => shiftMonth(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" className="rounded-full border-border/70 shadow-none" onClick={() => shiftMonth(1)}>
            <ChevronRight />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAY_LABELS.map((d, i) => (
            <div key={i} className="py-1">
              {d}
            </div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateKey = `${year}-${pad(month)}-${pad(dayNum)}`;
            const isToday = dateKey === todayKey;
            const isWeekend = new Date(year, month - 1, dayNum).getDay() === 0;
            const dayEvents = eventsOnDay(dateKey);
            const holiday = holidayOnDay(dateKey);

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDate(dateKey)}
                className={`flex min-h-20 flex-col items-start gap-0.5 rounded-lg border p-1 text-left transition-colors ${
                  isToday
                    ? "border-brand-orange bg-orange-50"
                    : holiday
                      ? "border-blue-200 bg-blue-50"
                      : isWeekend
                        ? "border-transparent bg-muted/40"
                        : "border-transparent hover:bg-muted/60"
                }`}
              >
                <span className={`text-xs font-semibold ${isToday ? "text-brand-orange" : "text-foreground"}`}>
                  {dayNum}
                </span>
                {holiday && <span className="w-full truncate text-[9px] font-medium text-blue-700">{holiday.name}</span>}
                {dayEvents.slice(0, 2).map((ev) => (
                  <span
                    key={ev.leaveId}
                    className="w-full truncate rounded px-1 text-[9px] font-medium text-white"
                    style={{ backgroundColor: ev.typeColor, opacity: ev.status === "APPLIED" ? 0.6 : 1 }}
                  >
                    {ev.employeeName.split(" ")[0]}
                  </span>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 2} more</span>
                )}
              </button>
            );
          })}
        </div>
        {isPending && <p className="mt-2 text-center text-xs text-muted-foreground">Loading…</p>}

        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5">
            <span className="size-1.5 rounded-full bg-blue-500" /> Holiday
          </span>
          <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5">
            <span className="size-1.5 rounded-full bg-muted-foreground/40" /> Weekend
          </span>
          <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5">
            <span className="size-1.5 rounded-full bg-emerald-500 opacity-60" /> Pending Leave
          </span>
          <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Approved Leave
          </span>
        </div>
      </CardContent>

      <Dialog open={selectedDate !== null} onOpenChange={(o) => !o && setSelectedDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedHoliday && (
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">🎉 {selectedHoliday.name}</p>
            )}
            {selectedEvents.length === 0 && !selectedHoliday && (
              <p className="text-sm text-muted-foreground">No leave events on this day.</p>
            )}
            {selectedEvents.map((ev) => (
              <div key={ev.leaveId} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{ev.employeeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {ev.typeName}
                    {ev.isHalfDay ? " · Half Day" : ""}
                  </p>
                </div>
                <Badge variant={ev.status === "APPROVED" ? "default" : "secondary"}>{ev.status}</Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
