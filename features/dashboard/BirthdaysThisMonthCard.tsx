"use client";

import { useState, useEffect, useTransition } from "react";
import { Cake, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getBirthdayCalendarAction } from "@/actions/dashboard.actions";
import type { MonthBirthday } from "@/services/birthdayService";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDaysUntil(daysUntil: number): { label: string; color: string } {
  if (daysUntil === 0) return { label: "Today! 🎉", color: "text-pink-500 font-semibold" };
  if (daysUntil === 1) return { label: "Tomorrow", color: "text-amber-500" };
  if (daysUntil < 0) return { label: "Passed", color: "text-muted-foreground/50" };
  return { label: `In ${daysUntil}d`, color: "text-muted-foreground" };
}

export function BirthdaysThisMonthCard({
  initialBirthdays,
  initialMonth,
  initialYear,
}: {
  initialBirthdays: MonthBirthday[];
  initialMonth: number;
  initialYear: number;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [birthdays, setBirthdays] = useState<MonthBirthday[]>(initialBirthdays);
  const [isPending, startTransition] = useTransition();

  // Fetch when month/year changes (skip initial — already loaded)
  const [isInitial, setIsInitial] = useState(true);
  useEffect(() => {
    if (isInitial) { setIsInitial(false); return; }
    startTransition(async () => {
      const data = await getBirthdayCalendarAction(year, month);
      setBirthdays(data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  return (
    <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="flex size-6 items-center justify-center rounded-lg bg-pink-500/15 text-pink-400">
            <Cake className="size-3.5" />
          </span>
          Birthdays
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-full border-border/70 shadow-none"
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-[90px] text-center text-[11px] font-medium text-muted-foreground">
            {monthLabel}
          </span>
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
        {isPending ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
        ) : birthdays.length === 0 ? (
          <div className="py-6 text-center">
            <span className="text-2xl">🎂</span>
            <p className="mt-2 text-xs text-muted-foreground">No birthdays in {MONTH_NAMES[month - 1]}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {birthdays.map((person) => {
              const { label, color } = formatDaysUntil(person.daysUntil);
              const isToday = person.daysUntil === 0;
              const passed = person.daysUntil < 0;
              return (
                <div
                  key={person.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                    isToday
                      ? "bg-pink-500/10 ring-1 ring-pink-500/20"
                      : passed
                      ? "opacity-40"
                      : "hover:bg-muted/60"
                  }`}
                >
                  {/* Day badge */}
                  <div className="flex size-9 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 text-center leading-tight">
                    <span className="text-[9px] font-medium text-pink-400">
                      {MONTH_NAMES[month - 1].slice(0, 3)}
                    </span>
                    <span className="text-sm font-bold text-pink-500">{person.day}</span>
                  </div>

                  {/* Name + dept */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{person.fullName}</p>
                    {person.departmentName && (
                      <p className="truncate text-[11px] text-muted-foreground">{person.departmentName}</p>
                    )}
                  </div>

                  {/* Days until */}
                  <span className={`shrink-0 text-[10px] ${color}`}>{label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer count */}
        {birthdays.length > 0 && (
          <p className="mt-3 text-center text-[10px] text-muted-foreground/70">
            {birthdays.length} birthday{birthdays.length !== 1 ? "s" : ""} in {MONTH_NAMES[month - 1]}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
