"use client";

import { toast } from "sonner";
import { Coffee } from "lucide-react";
import { useBreakActivity } from "@/lib/hooks/useBreakActivity";
import { playChime } from "@/lib/audio/beep";
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

/** Mounted only for ADMIN sessions — silently polls for break start/end events app-wide. */
export function BreakAlertListener() {
  useBreakActivity("/api/admin/break-status", {
    onStart: (person) => notify("start", person),
    onEnd: (person) => notify("end", person),
  });

  return null;
}
