"use client";

import { useEffect, useState } from "react";
import { Clock4 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getShiftBreakdownAction } from "@/actions/dashboard.actions";
import type { ShiftBreakdownRow } from "@/services/dashboardService";

const REFRESH_INTERVAL_MS = 15000;

function formatTimeOfDay(minutesOfDay: number): string {
  const h24 = Math.floor(minutesOfDay / 60) % 24;
  const m = minutesOfDay % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

const MINI_STATS = [
  { key: "totalEmployees" as const, label: "Total", color: "text-foreground" },
  { key: "presentToday" as const, label: "Present", color: "text-emerald-600" },
  { key: "workingNow" as const, label: "Working", color: "text-blue-600" },
  { key: "lateToday" as const, label: "Late", color: "text-amber-600" },
  { key: "onBreakNow" as const, label: "Break", color: "text-orange-500" },
  { key: "absentToday" as const, label: "Absent", color: "text-red-500" },
];

export function ShiftBreakdownTable({ initialData }: { initialData: ShiftBreakdownRow[] }) {
  const [rows, setRows] = useState(initialData);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const fresh = await getShiftBreakdownAction();
        setRows(fresh);
      } catch {
        // transient network hiccup — the next poll will retry
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
      <CardHeader className="flex flex-row items-center gap-2 border-b border-border/60 pb-4">
        <Clock4 className="size-4 text-brand-blue" />
        <CardTitle className="text-base font-semibold">Shifts Right Now</CardTitle>
        <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          {rows.filter((r) => r.isCurrentlyActive).length} active
        </span>
      </CardHeader>
      <CardContent className="pt-4">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No shifts configured.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <div
                key={row.shiftId}
                className={`relative overflow-hidden rounded-xl border p-4 transition-colors ${
                  row.isCurrentlyActive
                    ? "border-emerald-200 bg-emerald-50/60"
                    : "border-border/60 bg-muted/30"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{row.shiftName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatTimeOfDay(row.startMinutesOfDay)} – {formatTimeOfDay(row.endMinutesOfDay)}
                    </p>
                  </div>
                  {row.isCurrentlyActive ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-white">
                      <span className="size-1.5 animate-pulse rounded-full bg-white" />
                      LIVE
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      OFF
                    </span>
                  )}
                </div>

                {/* Divider */}
                <div className="my-3 h-px bg-border/60" />

                {/* Mini stats grid */}
                <div className="grid grid-cols-3 gap-y-2">
                  {MINI_STATS.map(({ key, label, color }) => (
                    <div key={key} className="text-center">
                      <p className={`text-base font-bold ${color}`}>{row[key]}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
