"use client";

import { useEffect, useState } from "react";

function nowMinutes(timezone: string): number {
  const hourStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    timeZone: timezone,
  }).format(new Date());
  const [h, m] = hourStr.split(":").map(Number);
  return h * 60 + m;
}

function fmtDuration(totalMinutes: number): string {
  const abs = Math.abs(totalMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function ShiftProgress({
  startMinutesOfDay,
  endMinutesOfDay,
  timezone,
}: {
  startMinutesOfDay: number;
  endMinutesOfDay: number;
  timezone: string;
}) {
  const [current, setCurrent] = useState(() => nowMinutes(timezone));

  useEffect(() => {
    const id = setInterval(() => setCurrent(nowMinutes(timezone)), 60_000);
    return () => clearInterval(id);
  }, [timezone]);

  // Handle overnight shifts (e.g. 12:00 AM – 9:00 AM where end < start)
  let start = startMinutesOfDay;
  let end = endMinutesOfDay;
  if (end <= start) end += 24 * 60; // normalise across midnight

  let cur = current;
  // If current time is before shift start and shift is overnight, advance by a day
  if (cur < start && end > 24 * 60) cur += 24 * 60;

  const total = end - start;
  const elapsed = Math.min(Math.max(cur - start, 0), total);
  const remaining = total - elapsed;
  const pct = Math.round((elapsed / total) * 100);

  const isDone = elapsed >= total;
  const notStarted = cur < start;

  const statusLabel = isDone
    ? "Shift complete"
    : notStarted
      ? `Starts in ${fmtDuration(start - current)}`
      : `${fmtDuration(remaining)} remaining`;

  const barColor = isDone
    ? "bg-emerald-400"
    : pct > 75
      ? "bg-amber-400"
      : "bg-brand-orange";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-white/50">Shift Progress</span>
        <span className={`font-medium ${isDone ? "text-emerald-400" : "text-white/80"}`}>
          {statusLabel}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-white/35">
        <span>{fmtDuration(elapsed)} worked</span>
        <span>{pct}%</span>
        <span>{fmtDuration(total)} total</span>
      </div>
    </div>
  );
}
