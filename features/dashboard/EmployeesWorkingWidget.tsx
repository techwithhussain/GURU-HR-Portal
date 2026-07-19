"use client";

import { useEffect, useState } from "react";
import { Laptop, Clock, LogIn } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmployeesWorkingAction } from "@/actions/dashboard.actions";
import type { EmployeeWorking } from "@/services/dashboardService";
import { useServerTime } from "@/hooks/useServerTime";

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
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

/** Formats a UTC ISO timestamp as a time string in the company's timezone (IST). */
function fmtLoginTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  });
}

export function EmployeesWorkingWidget({
  initialData,
  timezone,
}: {
  initialData: EmployeeWorking[];
  timezone: string;
}) {
  const [employees, setEmployees] = useState<EmployeeWorking[]>(initialData);
  // Server-synced clock — unaffected by the admin's system clock settings.
  const now = useServerTime();

  useEffect(() => {
    const poll = setInterval(async () => {
      const fresh = await getEmployeesWorkingAction();
      setEmployees(fresh);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(poll);
  }, []);

  return (
    <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          Employees Currently Working
        </CardTitle>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          {employees.length} live
        </span>
      </CardHeader>
      <CardContent className="space-y-1 pt-4">
        {employees.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">No one is working right now.</p>
        )}
        {employees.map((emp) => {
          const seconds = now ? elapsedSeconds(emp.checkInAt, now) : 0;
          return (
            <div
              key={emp.employeeId}
              className="flex flex-wrap items-center gap-2 rounded-xl px-1 py-2.5 sm:flex-nowrap sm:gap-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-600">
                {initials(emp.employeeName)}
              </div>
              <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                <p className="truncate text-sm font-medium">{emp.employeeName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {emp.departmentName ?? "—"} · {emp.designationName ?? "—"}
                </p>
              </div>
              {emp.shiftName && (
                <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <Laptop className="size-3.5" />
                  {emp.shiftName}
                </div>
              )}
              {/* Login time in IST — independent of server or browser timezone */}
              <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <LogIn className="size-3.5" />
                <span>{fmtLoginTime(emp.checkInAt, timezone)}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                <Clock className="size-3.5" />
                <span className="text-right font-mono text-xs font-semibold">
                  {now ? elapsedLabel(seconds) : "--:--"}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
