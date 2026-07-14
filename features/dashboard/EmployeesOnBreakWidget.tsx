"use client";

import { useEffect, useState } from "react";
import { Coffee } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BREAK_OPTIONS } from "@/features/attendance/BreakSelectDialog";
import { getEmployeesOnBreakAction } from "@/actions/dashboard.actions";
import type { EmployeeOnBreak } from "@/services/dashboardService";

const REFRESH_INTERVAL_MS = 8000;

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function elapsedSeconds(startAt: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(startAt).getTime()) / 1000));
}

function elapsedLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function EmployeesOnBreakWidget({ initialData }: { initialData: EmployeeOnBreak[] }) {
  const [employees, setEmployees] = useState<EmployeeOnBreak[]>(initialData);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const poll = setInterval(async () => {
      const fresh = await getEmployeesOnBreakAction();
      setEmployees(fresh);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(poll);
  }, []);

  return (
    <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-orange-500" />
          </span>
          Employees Currently on Break
        </CardTitle>
        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
          {employees.length} live
        </span>
      </CardHeader>
      <CardContent className="space-y-1 pt-4">
        {employees.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">No one is on break right now.</p>
        )}
        {employees.map((emp) => {
          const option = BREAK_OPTIONS.find((o) => o.type === emp.breakType);
          const Icon = option?.icon ?? Coffee;
          const seconds = now ? elapsedSeconds(emp.startAt, now) : 0;
          const isOver = now != null && seconds > (option?.maxMinutes ?? 30) * 60;
          return (
            <div key={emp.employeeId} className="flex flex-wrap items-center gap-2 rounded-xl px-1 py-2.5 sm:flex-nowrap sm:gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-xs font-semibold text-brand-orange">
                {initials(emp.employeeName)}
              </div>
              <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                <p className="truncate text-sm font-medium">{emp.employeeName}</p>
                <p className="truncate text-xs text-muted-foreground">{emp.departmentName ?? "—"}</p>
              </div>
              <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${option?.soft ?? "bg-muted text-muted-foreground"}`}>
                <Icon className="size-3.5" />
                {option?.label ?? emp.breakType}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span
                  className={`w-12 text-right font-mono text-xs font-semibold ${isOver ? "text-rose-600" : "text-muted-foreground"}`}
                  title={isOver ? "Over the suggested time for this break" : undefined}
                >
                  {now ? elapsedLabel(seconds) : "--:--"}
                </span>
                {isOver && (
                  <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                    OVER
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
