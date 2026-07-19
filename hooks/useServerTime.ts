"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Returns a live `Date` that is always synced to the SERVER's clock,
 * regardless of the browser's system clock.
 *
 * How it works:
 *  1. On mount, fetches `/api/server-time` once to get the true UTC instant.
 *  2. Uses `performance.now()` — a monotonic, system-clock-independent timer —
 *     to tick forward from that base. Even if the OS clock drifts or is wrong,
 *     the elapsed time measured by `performance.now()` stays accurate.
 *  3. Falls back to `new Date()` (client time) only if the fetch fails.
 */
export function useServerTime(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  const baseRef = useRef<{ serverMs: number; perfMs: number } | null>(null);

  useEffect(() => {
    let tickId: ReturnType<typeof setInterval>;

    fetch("/api/server-time")
      .then((r) => r.json())
      .then(({ now: serverNow }: { now: string }) => {
        baseRef.current = {
          serverMs: new Date(serverNow).getTime(),
          perfMs: performance.now(),
        };
        setNow(new Date(serverNow));
      })
      .catch(() => {
        // Graceful fallback: use client time if server fetch fails
        baseRef.current = {
          serverMs: Date.now(),
          perfMs: performance.now(),
        };
        setNow(new Date());
      });

    tickId = setInterval(() => {
      if (baseRef.current) {
        const elapsedMs = performance.now() - baseRef.current.perfMs;
        setNow(new Date(baseRef.current.serverMs + elapsedMs));
      }
    }, 1000);

    return () => clearInterval(tickId);
  }, []);

  return now;
}
