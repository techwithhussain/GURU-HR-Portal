"use client";

import { CalendarDays } from "lucide-react";
import { useServerTime } from "@/hooks/useServerTime";

export function LiveClock({ timezone }: { timezone: string }) {
  // Server-synced clock — unaffected by the browser's system clock settings.
  const now = useServerTime();

  if (!now) return null;

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <div className="flex size-8 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
        <CalendarDays className="size-4" />
      </div>
      <div className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold tabular-nums">
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: timezone })}
        </span>
        <span className="text-xs text-muted-foreground">
          {now.toLocaleDateString([], {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
            timeZone: timezone,
          })}
        </span>
      </div>
    </div>
  );
}
