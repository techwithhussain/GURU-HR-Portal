"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Clock, Monitor, UserCheck, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { reviewInactivityEventAction } from "@/actions/inactivity.actions";
import type { InactivityEventWithEmployee } from "@/services/inactivityService";

function fmtTime(iso: string, timezone: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: timezone,
  });
}

function fmtDate(iso: string, timezone: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "2-digit", month: "short", year: "numeric", timeZone: timezone,
  });
}

function formatMinutes(min: number | null): string {
  if (!min) return "—";
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function EventRow({
  event,
  timezone,
}: {
  event: InactivityEventWithEmployee;
  timezone: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);

  function review(action: "IGNORED" | "NOTED") {
    startTransition(async () => {
      const result = await reviewInactivityEventAction(event.id, action, note || undefined);
      if (!result.success) { toast.error(result.error ?? "Failed"); return; }
      toast.success(action === "IGNORED" ? "Marked as ignored" : "Noted");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:bg-muted/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Employee info */}
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-brand-orange-light text-sm font-bold text-white">
            {initials(event.employee.fullName)}
          </span>
          <div>
            <p className="font-semibold text-foreground">{event.employee.fullName}</p>
            <p className="text-xs text-muted-foreground">{event.employee.user?.employeeCode ?? "—"}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-1.5">
            <Clock className="size-3.5 text-muted-foreground" />
            {fmtDate(event.inactiveFrom.toISOString(), timezone)} &nbsp;
            {fmtTime(event.inactiveFrom.toISOString(), timezone)}
            {event.inactiveTo && <> – {fmtTime(event.inactiveTo.toISOString(), timezone)}</>}
          </span>
          <span className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 font-semibold text-rose-700">
            <UserCheck className="size-3.5" />
            Inactive: {formatMinutes(event.durationMin)}
          </span>
          {event.pcName && (
            <span className="flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-1.5 text-muted-foreground">
              <Monitor className="size-3.5" />
              {event.pcName}
            </span>
          )}
        </div>
      </div>

      {/* Note input */}
      {noteOpen && (
        <div className="mt-3">
          <input
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            placeholder="Optional note for this event…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isPending}
          />
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
          disabled={isPending}
          onClick={() => review("IGNORED")}
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
          Ignore
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50"
          disabled={isPending}
          onClick={() => { setNoteOpen((v) => !v); }}
        >
          <Filter className="size-3.5" />
          {noteOpen ? "Hide Note" : "Add Note"}
        </Button>
        <Button
          size="sm"
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          disabled={isPending}
          onClick={() => review("NOTED")}
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          Mark Noted
        </Button>
      </div>
    </div>
  );
}

export function InactivityTable({
  initialEvents,
  timezone,
}: {
  initialEvents: InactivityEventWithEmployee[];
  timezone: string;
}) {
  if (initialEvents.length === 0) {
    return (
      <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
            <Check className="size-7" />
          </span>
          <p className="text-base font-semibold text-foreground">All clear!</p>
          <p className="text-sm text-muted-foreground">
            No pending inactivity events to review.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Pending Review</CardTitle>
          <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">
            {initialEvents.length} event{initialEvents.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {initialEvents.map((event) => (
          <EventRow key={event.id} event={event} timezone={timezone} />
        ))}
      </CardContent>
    </Card>
  );
}
