"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Timer, Play, Square, CheckCircle2, Loader2, TrendingUp, Clock4 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { startOvertimeAction, endOvertimeAction } from "@/actions/attendance.actions";
import type { ActionResult } from "@/actions/attendance.actions";
import type { OvertimeStatusResult } from "@/services/attendanceService";

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  return `${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
}

function formatMinutes(minutes: number | null | undefined): string {
  if (!minutes) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: timezone,
  });
}

function useLiveSeconds(startIso: string | undefined): number {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!startIso) return;
    const startMs = new Date(startIso).getTime();
    const tick = () => {
      setSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startIso]);

  return seconds;
}

export function OvertimePanel({
  overtimeStatus,
  timezone,
}: {
  overtimeStatus: OvertimeStatusResult;
  timezone: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  const activeStartIso = overtimeStatus.state === "ACTIVE" ? overtimeStatus.session.startAt : undefined;
  const liveSeconds = useLiveSeconds(activeStartIso);

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong");
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  if (overtimeStatus.state === "NO_ATTENDANCE" || overtimeStatus.state === "SHIFT_ACTIVE") {
    return null;
  }

  return (
    <>
      <Card className="overflow-hidden rounded-2xl border-0 shadow-elevated ring-1 ring-black/[0.03]">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <TrendingUp className="size-4" />
            </span>
            <CardTitle className="text-base font-semibold">Overtime</CardTitle>
          </div>
          {overtimeStatus.state === "AVAILABLE" && (
            <Badge variant="outline" className="border-violet-200 text-violet-600 text-xs">
              Available
            </Badge>
          )}
          {overtimeStatus.state === "ACTIVE" && (
            <Badge className="gap-1.5 bg-violet-100 text-violet-700 hover:bg-violet-100 text-xs">
              <span className="size-1.5 animate-pulse rounded-full bg-violet-600" />
              In Progress
            </Badge>
          )}
          {overtimeStatus.state === "COMPLETED" && (
            <Badge className="gap-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">
              <CheckCircle2 className="size-3" />
              Completed
            </Badge>
          )}
        </CardHeader>

        <CardContent className="pt-5">
          {overtimeStatus.state === "AVAILABLE" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                    <Clock4 className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-violet-900">Your shift has ended</p>
                    <p className="mt-0.5 text-xs text-violet-700/70">
                      Shift ended at{" "}
                      <span className="font-medium text-violet-800">
                        {fmtTime(overtimeStatus.shiftEndAt, timezone)}
                      </span>
                      . Start overtime if you want to continue working.
                    </p>
                  </div>
                </div>
              </div>
              <Button
                id="start-overtime-btn"
                disabled={isPending}
                onClick={() => run(startOvertimeAction)}
                className="w-full rounded-xl bg-violet-600 py-5 text-sm font-semibold shadow-soft shadow-violet-600/20 hover:bg-violet-700 sm:w-auto"
              >
                {isPending ? (
                  <><Loader2 className="animate-spin" /> Starting…</>
                ) : (
                  <><Play className="size-4" /> Start Overtime</>
                )}
              </Button>
            </div>
          )}

          {overtimeStatus.state === "ACTIVE" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-600 to-indigo-700 px-5 py-4 text-white shadow-soft shadow-violet-600/20">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                  <Timer className="size-5" />
                </span>
                <div className="flex-1">
                  <p className="text-xs font-medium text-white/70">Overtime in progress</p>
                  <p className="font-mono text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
                    {formatDuration(liveSeconds)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-white/60">Started at</p>
                  <p className="text-xs font-semibold text-white">
                    {fmtTime(overtimeStatus.session.startAt, timezone)}
                  </p>
                </div>
              </div>

              <Button
                id="end-overtime-btn"
                disabled={isPending}
                onClick={() => setConfirmEndOpen(true)}
                variant="outline"
                className="w-full rounded-xl border-rose-200 bg-rose-50 py-5 text-sm font-semibold text-rose-700 shadow-soft hover:bg-rose-100 sm:w-auto"
              >
                {isPending ? (
                  <><Loader2 className="animate-spin" /> Ending…</>
                ) : (
                  <><Square className="size-4 fill-rose-500 text-rose-500" /> End Overtime</>
                )}
              </Button>
            </div>
          )}

          {overtimeStatus.state === "COMPLETED" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Overtime completed!</p>
                    <p className="mt-0.5 text-xs text-emerald-700/70">
                      Great work! Your extra time has been recorded.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-muted/50 px-3.5 py-2.5 text-center">
                  <p className="text-[11px] font-medium text-muted-foreground">Started</p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    {fmtTime(overtimeStatus.session.startAt, timezone)}
                  </p>
                </div>
                {overtimeStatus.session.endAt && (
                  <div className="rounded-xl bg-muted/50 px-3.5 py-2.5 text-center">
                    <p className="text-[11px] font-medium text-muted-foreground">Ended</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                      {fmtTime(overtimeStatus.session.endAt, timezone)}
                    </p>
                  </div>
                )}
                <div className="col-span-2 rounded-xl bg-violet-50 px-3.5 py-2.5 text-center sm:col-span-1">
                  <p className="text-[11px] font-medium text-violet-600">Total Overtime</p>
                  <p className="mt-0.5 text-sm font-semibold text-violet-700">
                    {formatMinutes(overtimeStatus.session.durationMin)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmEndOpen} onOpenChange={setConfirmEndOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End overtime session?</DialogTitle>
            <DialogDescription>
              You&apos;ve been working for{" "}
              <span className="font-semibold text-foreground">{formatDuration(liveSeconds)}</span> in overtime.
              This will be saved in your reports.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEndOpen(false)}>
              Continue Working
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                setConfirmEndOpen(false);
                run(endOvertimeAction);
              }}
            >
              End Overtime
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
