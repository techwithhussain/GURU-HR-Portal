"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <div className="flex size-8 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
        <CalendarDays className="size-4" />
      </div>
      <div className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold tabular-nums">
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span className="text-xs text-muted-foreground">
          {now.toLocaleDateString([], { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        </span>
      </div>
    </div>
  );
}
