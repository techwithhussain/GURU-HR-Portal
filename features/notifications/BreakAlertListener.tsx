"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Coffee, AlertTriangle } from "lucide-react";
import { useBreakActivity } from "@/lib/hooks/useBreakActivity";
import { playChime, unlockAudio } from "@/lib/audio/beep";
import { BREAK_TYPE_MAX_MINUTES } from "@/features/attendance/BreakSelectDialog";
import type { EmployeeOnBreak } from "@/services/attendanceService";

const BREAK_LABELS: Record<string, string> = {
  LUNCH: "Meal Break",
  WASHROOM: "Bio Break",
  PERSONAL: "Casual Break",
  MEETING: "Super Break",
};

function breakLabel(type: string): string {
  return BREAK_LABELS[type] ?? type;
}

function notify(kind: "start" | "end", person: EmployeeOnBreak) {
  playChime();
  const label = breakLabel(person.type);
  toast(kind === "start" ? `${person.employeeName} started a ${label}` : `${person.employeeName} is back from break`, {
    icon: <Coffee className="size-4" />,
  });
}

function notifyOverLimit(person: EmployeeOnBreak, maxMinutes: number) {
  playChime();
  const label = breakLabel(person.type);
  toast.warning(`${person.employeeName}'s ${label} has gone over the ${maxMinutes}-minute limit`, {
    icon: <AlertTriangle className="size-4" />,
  });
}

/** Mounted only for ADMIN sessions — silently polls for break start/end events app-wide. */
export function BreakAlertListener() {
  // Tracks which currently-open breaks we've already alerted on, so the
  // over-limit alert fires once per break the instant it crosses the line —
  // not on every 5s poll for as long as the person stays over.
  const alertedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Browsers block audio until a real user gesture happens on the page —
    // the admin's very first click anywhere (a nav link, a button, etc.) is
    // enough to unlock it for the rest of the session.
    function unlock() {
      unlockAudio();
      document.removeEventListener("click", unlock);
    }
    document.addEventListener("click", unlock);
    return () => document.removeEventListener("click", unlock);
  }, []);

  const onBreak = useBreakActivity("/api/admin/break-status", {
    onStart: (person) => {
      alertedRef.current.delete(person.breakId);
      notify("start", person);
    },
    onEnd: (person) => {
      alertedRef.current.delete(person.breakId);
      notify("end", person);
    },
  });

  useEffect(() => {
    for (const person of onBreak) {
      const maxMinutes = BREAK_TYPE_MAX_MINUTES[person.type];
      if (maxMinutes == null || alertedRef.current.has(person.breakId)) continue;

      const elapsedMinutes = (Date.now() - new Date(person.startAt).getTime()) / 60_000;
      if (elapsedMinutes > maxMinutes) {
        alertedRef.current.add(person.breakId);
        notifyOverLimit(person, maxMinutes);
      }
    }
  }, [onBreak]);

  return null;
}
