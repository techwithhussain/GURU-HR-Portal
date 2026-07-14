// Matches the labels shown in the break-selection UI (features/attendance/BreakSelectDialog.tsx).
const BREAK_TYPE_LABELS: Record<string, string> = {
  LUNCH: "Meal Break",
  WASHROOM: "Bio Break",
  PERSONAL: "Casual Break",
  MEETING: "Super Break",
  TEA: "Tea Break",
  OTHER: "Break",
};

export interface TimelineEvent {
  time: string;
  label: string;
}

export function buildTimeline(input: {
  checkInAt: Date | null;
  checkOutAt: Date | null;
  breaks: Array<{ type: string; startAt: Date; endAt: Date | null }>;
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (input.checkInAt) {
    events.push({ time: input.checkInAt.toISOString(), label: "Logged In" });
  }
  for (const b of input.breaks) {
    const label = BREAK_TYPE_LABELS[b.type] ?? "Break";
    events.push({ time: b.startAt.toISOString(), label: `${label} Started` });
    if (b.endAt) {
      events.push({ time: b.endAt.toISOString(), label: `${label} Ended` });
    }
  }
  if (input.checkOutAt) {
    events.push({ time: input.checkOutAt.toISOString(), label: "Logged Out" });
  }

  return events.sort((a, b) => a.time.localeCompare(b.time));
}
