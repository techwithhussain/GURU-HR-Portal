"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Coffee, LogIn, LogOut, Loader2, Pause, Play, Timer as TimerIcon, Clock3, Sunrise } from "lucide-react";
import { useServerTime } from "@/hooks/useServerTime";
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
import {
  BreakSelectDialog,
  BREAK_TYPE_LABELS,
  BREAK_TYPE_MAX_MINUTES,
  BREAK_OPTIONS,
  type BreakOptionType,
} from "@/features/attendance/BreakSelectDialog";
import {
  checkInAction,
  checkOutAction,
  endBreakAction,
  startBreakAction,
  type ActionResult,
} from "@/actions/attendance.actions";
import type { getCurrentStatus } from "@/services/attendanceService";

type AttendanceStatus = Awaited<ReturnType<typeof getCurrentStatus>>;

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return "—";
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** Total break minutes used today (out of the shift's daily allowance),
 * including the currently-running break's live elapsed time if on one. */
function liveBreakUsedMinutes(status: AttendanceStatus, now: Date | null): number {
  if (status.state !== "CHECKED_IN" && status.state !== "ON_BREAK") return 0;
  if (!status.breakBudget) return 0;

  let minutes = status.breakBudget.usedMinutes;
  if (status.state === "ON_BREAK" && now) {
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - new Date(status.activeBreak.startAt).getTime()) / 1000));
    minutes += Math.floor(elapsedSeconds / 60);
  }
  return minutes;
}

/** Working time so far today, ticking live and paused while on break — unlike
 * `attendance.workingMinutes`, which is only ever set at checkout. */
function liveWorkingDuration(status: AttendanceStatus, now: Date | null): string {
  if (status.state === "NOT_CHECKED_IN") return "—";
  if (status.state === "CHECKED_OUT") return formatMinutes(status.attendance.workingMinutes);
  if (!now || !status.attendance.checkInAt) return "—";

  const checkInAt = new Date(status.attendance.checkInAt);
  const completedBreakSeconds = status.attendance.breaks
    .filter((b) => b.endAt)
    .reduce((sum, b) => sum + (b.durationMin ?? 0) * 60, 0);

  // While on break, freeze the counter at the moment the break started —
  // it resumes ticking once "Resume Work" is pressed.
  const upTo = status.state === "ON_BREAK" ? new Date(status.activeBreak.startAt) : now;
  const elapsedSeconds = Math.max(0, Math.floor((upTo.getTime() - checkInAt.getTime()) / 1000));
  const workingSeconds = Math.max(0, elapsedSeconds - completedBreakSeconds);

  const h = Math.floor(workingSeconds / 3600);
  const m = Math.floor((workingSeconds % 3600) / 60);
  const s = workingSeconds % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
}

function formatTimeOfDay(minutesOfDay: number): string {
  const h24 = Math.floor(minutesOfDay / 60) % 24;
  const m = minutesOfDay % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function breakLabel(type: string): string {
  return BREAK_TYPE_LABELS[type] ?? `${type.charAt(0) + type.slice(1).toLowerCase()} Break`;
}

// Pinned locale/options so server-rendered and client-hydrated markup match exactly
// (bare toLocaleTimeString() defaults can differ between Node and the browser), and
// timeZone is always the company's, not the viewing device's.
function fmtTime(date: Date, timezone: string): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: timezone,
  });
}

type TimelineKind = "in" | "break" | "resume" | "out";

interface TimelineEntry {
  label: string;
  at: Date;
  kind: TimelineKind;
}

const TIMELINE_STYLE: Record<TimelineKind, { icon: typeof LogIn; ring: string; bg: string }> = {
  in: { icon: LogIn, ring: "ring-emerald-200", bg: "bg-emerald-500" },
  break: { icon: Coffee, ring: "ring-orange-200", bg: "bg-orange-500" },
  resume: { icon: Play, ring: "ring-blue-200", bg: "bg-blue-500" },
  out: { icon: LogOut, ring: "ring-rose-200", bg: "bg-rose-500" },
};

function buildTimeline(status: AttendanceStatus): TimelineEntry[] {
  if (status.state === "NOT_CHECKED_IN") return [];

  const entries: TimelineEntry[] = [];
  if (status.attendance.checkInAt) {
    entries.push({ label: "Login", at: new Date(status.attendance.checkInAt), kind: "in" });
  }
  for (const b of status.attendance.breaks) {
    entries.push({ label: breakLabel(b.type), at: new Date(b.startAt), kind: "break" });
    if (b.endAt) entries.push({ label: "Resume Work", at: new Date(b.endAt), kind: "resume" });
  }
  if (status.attendance.checkOutAt) {
    entries.push({ label: "Logout", at: new Date(status.attendance.checkOutAt), kind: "out" });
  }
  return entries.sort((a, b) => a.at.getTime() - b.at.getTime());
}

type StepState = "done" | "active" | "upcoming" | "pending" | "skipped";

interface StepInfo {
  label: string;
  icon: typeof LogIn;
  state: StepState;
  time?: string;
}

const STEP_STYLE: Record<StepState, { circle: string; text: string; line: string }> = {
  done: { circle: "bg-emerald-500 text-white ring-4 ring-emerald-100", text: "text-foreground", line: "bg-emerald-400" },
  active: { circle: "bg-orange-500 text-white ring-4 ring-orange-100 animate-pulse", text: "text-foreground", line: "bg-border" },
  upcoming: { circle: "bg-muted text-muted-foreground ring-4 ring-muted/50", text: "text-muted-foreground", line: "bg-border" },
  pending: { circle: "bg-muted text-muted-foreground ring-4 ring-muted/50", text: "text-muted-foreground", line: "bg-border" },
  skipped: { circle: "bg-muted text-muted-foreground ring-4 ring-muted/50", text: "text-muted-foreground line-through decoration-1", line: "bg-border" },
};

function AttendanceStepper({ status, timezone }: { status: AttendanceStatus; timezone: string }) {
  const checkInDone = status.state !== "NOT_CHECKED_IN";
  const checkedOut = status.state === "CHECKED_OUT";
  const onBreak = status.state === "ON_BREAK";
  const hadBreak = status.state !== "NOT_CHECKED_IN" && status.attendance.breaks.length > 0;

  const steps: StepInfo[] = [
    {
      label: "Login",
      icon: LogIn,
      state: checkInDone ? "done" : "pending",
      time: checkInDone ? fmtTime(new Date(status.attendance.checkInAt!), timezone) : undefined,
    },
    {
      label: "Break",
      icon: Coffee,
      state: onBreak ? "active" : checkedOut ? (hadBreak ? "done" : "skipped") : checkInDone ? "upcoming" : "pending",
      time: onBreak
        ? "In progress"
        : hadBreak && checkedOut
          ? fmtTime(new Date(status.attendance.breaks[status.attendance.breaks.length - 1].startAt), timezone)
          : undefined,
    },
    {
      label: "Logout",
      icon: LogOut,
      state: checkedOut ? "done" : "pending",
      time: checkedOut ? fmtTime(new Date(status.attendance.checkOutAt!), timezone) : undefined,
    },
  ];

  return (
    <div className="flex items-center rounded-2xl border border-border/60 bg-muted/20 px-4 py-4">
      {steps.map((step, i) => {
        const style = STEP_STYLE[step.state];
        const Icon = step.state === "done" ? Check : step.icon;
        return (
          <div key={step.label} className={i < steps.length - 1 ? "flex flex-1 items-center" : "flex items-center"}>
            <div className="flex w-24 shrink-0 flex-col items-center gap-1.5 text-center sm:w-28">
              <span className={`flex size-9 items-center justify-center rounded-full ${style.circle}`}>
                <Icon className="size-4" />
              </span>
              <span className={`text-xs font-semibold ${style.text}`}>{step.label}</span>
              <span className="text-[11px] text-muted-foreground">{step.time ?? "—"}</span>
            </div>
            {i < steps.length - 1 && <span className={`mb-6 h-0.5 flex-1 rounded-full ${style.line}`} />}
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  if (status.state === "NOT_CHECKED_IN") return <Badge variant="outline">Not logged in</Badge>;
  if (status.state === "CHECKED_IN")
    return (
      <Badge className="gap-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
        <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Working
      </Badge>
    );
  if (status.state === "ON_BREAK")
    return (
      <Badge className="gap-1.5 bg-orange-100 text-orange-700 hover:bg-orange-100">
        <span className="size-1.5 rounded-full bg-orange-500" /> On {breakLabel(status.activeBreak.type)}
      </Badge>
    );
  return <Badge variant="outline">Logged out</Badge>;
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3.5 py-2.5">
      <div className="flex items-center gap-2.5 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function BreakTimerBanner({
  activeBreak,
  now,
  timezone,
}: {
  activeBreak: { type: string; startAt: Date };
  now: Date | null;
  timezone: string;
}) {
  const option = BREAK_OPTIONS.find((o) => o.type === activeBreak.type);
  const Icon = option?.icon ?? Coffee;
  const maxMinutes = BREAK_TYPE_MAX_MINUTES[activeBreak.type] ?? 30;
  const elapsedSeconds = now ? Math.max(0, Math.floor((now.getTime() - activeBreak.startAt.getTime()) / 1000)) : 0;
  const remainingSeconds = maxMinutes * 60 - elapsedSeconds;
  const isOvertime = remainingSeconds < 0;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
        <Icon className="size-5" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-orange-900">{breakLabel(activeBreak.type)} in progress</p>
        <p className="text-xs text-orange-700/80">Started at {fmtTime(activeBreak.startAt, timezone)}</p>
      </div>
      <div className="text-right">
        <p className={`font-mono text-xl font-bold tabular-nums ${isOvertime ? "text-rose-600" : "text-orange-700"}`}>
          {formatClock(isOvertime ? -remainingSeconds : remainingSeconds)}
        </p>
        <p className="text-[11px] font-medium text-orange-700/70">
          {isOvertime ? "over the limit" : "remaining"}
        </p>
      </div>
    </div>
  );
}

export function CheckInPanel({
  status,
  shift,
  timezone,
}: {
  status: AttendanceStatus;
  shift?: { name: string; startMinutesOfDay: number; endMinutesOfDay: number } | null;
  timezone: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"checkIn" | "break" | "checkOut" | "resume" | null>(null);
  // Server-synced clock — unaffected by the employee's system clock settings.
  const now = useServerTime();
  const [breakDialogOpen, setBreakDialogOpen] = useState(false);
  const [earlyLogoutConfirmOpen, setEarlyLogoutConfirmOpen] = useState(false);

  function run(action: () => Promise<ActionResult>, actionName: typeof pendingAction) {
    setPendingAction(actionName);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong");
        // Re-sync with the server on failure too — a stale client view (e.g.
        // this session's attendance state changed elsewhere) is a common
        // cause of action failures, and refreshing lets the UI self-correct
        // instead of repeating the same failed action forever.
        router.refresh();
        setPendingAction(null);
        return;
      }
      router.refresh();
      setPendingAction(null);
    });
  }

  function handleSelectBreak(type: BreakOptionType) {
    setBreakDialogOpen(false);
    run(() => startBreakAction({ type }), "break");
  }

  const shiftEndAt = status.state === "CHECKED_IN" && status.shiftEndAt ? new Date(status.shiftEndAt) : null;
  const shiftNotOverYet = !!(shiftEndAt && now && now < shiftEndAt);

  function handleLogoutClick() {
    if (shiftNotOverYet) {
      setEarlyLogoutConfirmOpen(true);
      return;
    }
    run(checkOutAction, "checkOut");
  }

  const timeline = buildTimeline(status);
  const lastBreak = status.state !== "NOT_CHECKED_IN" ? [...status.attendance.breaks].pop() : undefined;

  let breakBlockedReason: string | null = null;
  if (status.state === "CHECKED_IN") {
    if (status.breakBudget && status.breakBudget.usedMinutes >= status.breakBudget.allowanceMinutes) {
      breakBlockedReason = "Today's break time is over.";
    } else if (status.companyBreakSlots && status.companyBreakSlots.active >= status.companyBreakSlots.max) {
      breakBlockedReason = "Break is full right now — please wait for a colleague to finish.";
    }
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-0 shadow-elevated ring-1 ring-black/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <CardTitle className="text-base font-semibold">Today&apos;s Attendance</CardTitle>
        <StatusBadge status={status} />
      </CardHeader>
      <CardContent className="space-y-7 pt-6">
        <AttendanceStepper status={status} timezone={timezone} />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-5">
            <div className="rounded-2xl bg-gradient-to-br from-brand-navy to-brand-navy-soft px-6 py-5 text-white shadow-soft">
              <p className="font-mono text-[2.6rem] font-bold leading-none tracking-tight tabular-nums">
                {now?.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZone: timezone,
                }) ?? "--:--:--"}
              </p>
              <p className="mt-2 text-xs text-white/60">
                {now?.toLocaleDateString([], {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  timeZone: timezone,
                })}
              </p>
            </div>

            {status.state === "ON_BREAK" && (
              <BreakTimerBanner
                activeBreak={{ type: status.activeBreak.type, startAt: new Date(status.activeBreak.startAt) }}
                now={now}
                timezone={timezone}
              />
            )}

            <div className="flex flex-wrap gap-2.5">
              {status.state === "NOT_CHECKED_IN" && (
                <Button
                  disabled={isPending}
                  onClick={() => run(checkInAction, "checkIn")}
                  className="rounded-xl bg-emerald-600 px-5 shadow-soft shadow-emerald-600/20 hover:bg-emerald-700"
                >
                  {pendingAction === "checkIn" ? <Loader2 className="animate-spin" /> : <LogIn />}
                  {pendingAction === "checkIn" ? "Logging in…" : "Login"}
                </Button>
              )}

              {status.state === "CHECKED_IN" && (
                <>
                  <Button
                    variant="secondary"
                    disabled={isPending || !!breakBlockedReason}
                    title={breakBlockedReason ?? undefined}
                    onClick={() => setBreakDialogOpen(true)}
                    className="rounded-xl bg-orange-100 px-5 text-orange-700 shadow-soft hover:bg-orange-200 disabled:opacity-60"
                  >
                    {pendingAction === "break" ? <Loader2 className="animate-spin" /> : <Pause />}
                    {pendingAction === "break" ? "Starting…" : "Break"}
                  </Button>
                  <Button
                    disabled={isPending}
                    onClick={handleLogoutClick}
                    className="rounded-xl bg-rose-600 px-5 shadow-soft shadow-rose-600/20 hover:bg-rose-700"
                  >
                    {pendingAction === "checkOut" ? <Loader2 className="animate-spin" /> : <LogOut />}
                    {pendingAction === "checkOut" ? "Logging out…" : "Logout"}
                  </Button>
                </>
              )}

              {breakBlockedReason && <p className="w-full text-xs text-amber-700">{breakBlockedReason}</p>}

              {status.state === "ON_BREAK" && (
                <Button
                  disabled={isPending}
                  onClick={() => run(endBreakAction, "resume")}
                  className="rounded-xl bg-blue-600 px-5 shadow-soft shadow-blue-600/20 hover:bg-blue-700"
                >
                  {pendingAction === "resume" ? <Loader2 className="animate-spin" /> : <Play />}
                  {pendingAction === "resume" ? "Resuming…" : "Resume Work (Pause Off)"}
                </Button>
              )}

              {status.state === "CHECKED_OUT" && (
                <p className="text-sm text-muted-foreground">
                  Working hours today: <span className="font-semibold text-foreground">{formatMinutes(status.attendance.workingMinutes)}</span>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {status.state !== "NOT_CHECKED_IN" && status.attendance.checkInAt && (
              <InfoRow
                icon={<LogIn className="size-4" />}
                label="Login"
                value={fmtTime(new Date(status.attendance.checkInAt), timezone)}
              />
            )}
            {lastBreak && (
              <InfoRow
                icon={<Coffee className="size-4" />}
                label="Last Break"
                value={`${fmtTime(new Date(lastBreak.startAt), timezone)}${lastBreak.endAt ? ` - ${fmtTime(new Date(lastBreak.endAt), timezone)}` : " (ongoing)"}`}
              />
            )}
            {status.state !== "NOT_CHECKED_IN" && (
              <InfoRow
                icon={<TimerIcon className="size-4" />}
                label="Working Duration"
                value={liveWorkingDuration(status, now)}
              />
            )}
            {(status.state === "CHECKED_IN" || status.state === "ON_BREAK") && status.breakBudget && (
              <InfoRow
                icon={<Coffee className="size-4" />}
                label="Break Used Today"
                value={`${liveBreakUsedMinutes(status, now)} / ${status.breakBudget.allowanceMinutes} min`}
              />
            )}
            {shift && (
              <InfoRow
                icon={<Sunrise className="size-4" />}
                label="Shift Time"
                value={`${formatTimeOfDay(shift.startMinutesOfDay)} - ${formatTimeOfDay(shift.endMinutesOfDay)}`}
              />
            )}
          </div>
        </div>

        {timeline.length > 0 && (
          <div>
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Clock3 className="size-4 text-muted-foreground" /> Today&apos;s Activity Timeline
            </p>
            <div className="flex items-start gap-0 overflow-x-auto pb-1">
              {timeline.map((entry, i) => {
                const style = TIMELINE_STYLE[entry.kind];
                const Icon = style.icon;
                return (
                  <div key={i} className="flex items-center">
                    <div className="flex w-24 flex-col items-center gap-2 text-center">
                      <span className={`flex size-9 items-center justify-center rounded-full ${style.bg} text-white ring-4 ${style.ring}`}>
                        <Icon className="size-4" />
                      </span>
                      <span className="text-xs font-semibold text-foreground">{entry.label}</span>
                      <span className="text-[11px] text-muted-foreground">{fmtTime(entry.at, timezone)}</span>
                    </div>
                    {i < timeline.length - 1 && <span className="mb-8 h-0.5 w-8 shrink-0 rounded-full bg-border sm:w-14" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      <BreakSelectDialog
        open={breakDialogOpen}
        onOpenChange={setBreakDialogOpen}
        onSelect={handleSelectBreak}
        disabled={isPending}
      />

      <Dialog open={earlyLogoutConfirmOpen} onOpenChange={setEarlyLogoutConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out before your shift ends?</DialogTitle>
            <DialogDescription>
              Your shift ends at {shiftEndAt ? fmtTime(shiftEndAt, timezone) : "—"}. This will be recorded as an
              early exit — make sure this isn&apos;t an accidental tap.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEarlyLogoutConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                setEarlyLogoutConfirmOpen(false);
                run(checkOutAction, "checkOut");
              }}
            >
              Log out anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
