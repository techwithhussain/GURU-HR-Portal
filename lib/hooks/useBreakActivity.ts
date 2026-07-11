"use client";

import { useEffect, useRef, useState } from "react";
import type { EmployeeOnBreak } from "@/services/attendanceService";

interface UseBreakActivityOptions {
  intervalMs?: number;
  onStart?: (person: EmployeeOnBreak) => void;
  onEnd?: (person: EmployeeOnBreak) => void;
}

/**
 * Polls a break-status endpoint and diffs consecutive snapshots by breakId to
 * detect start/end transitions. No websocket infra exists in this app, so
 * polling is the pragmatic way to get a "live" feel on the office TV and the
 * admin alert listener.
 */
export function useBreakActivity(fetchUrl: string | null, options: UseBreakActivityOptions = {}) {
  const { intervalMs = 5000 } = options;
  const [onBreak, setOnBreak] = useState<EmployeeOnBreak[]>([]);
  const previousRef = useRef<Map<string, EmployeeOnBreak> | null>(null);
  const onStartRef = useRef(options.onStart);
  const onEndRef = useRef(options.onEnd);
  onStartRef.current = options.onStart;
  onEndRef.current = options.onEnd;

  useEffect(() => {
    if (!fetchUrl) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(fetchUrl!, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: { onBreak: EmployeeOnBreak[] } = await res.json();
        if (cancelled) return;

        const current = new Map(data.onBreak.map((p) => [p.breakId, p]));
        const previous = previousRef.current;

        if (previous) {
          for (const [id, person] of current) {
            if (!previous.has(id)) onStartRef.current?.(person);
          }
          for (const [id, person] of previous) {
            if (!current.has(id)) onEndRef.current?.(person);
          }
        }

        previousRef.current = current;
        setOnBreak(data.onBreak);
      } catch {
        // transient network hiccup — the next poll will retry
      }
    }

    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fetchUrl, intervalMs]);

  return onBreak;
}
