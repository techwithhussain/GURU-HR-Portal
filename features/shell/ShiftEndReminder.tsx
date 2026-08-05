"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getAttendanceStatusAction } from "@/actions/attendance.actions";
import { useServerTime } from "@/hooks/useServerTime";
import { requestBrowserNotificationPermission, showBrowserNotification } from "@/lib/notifications/browserNotify";

const REMINDER_MINUTES_BEFORE = 10;
// Kept deliberately infrequent — this only needs to catch a ~10-minute
// window, and every logged-in employee runs this poll continuously on every
// page, which adds up across the whole company on shared hosting.
const STATUS_POLL_MS = 60000;

type AttendanceStatus = Awaited<ReturnType<typeof getAttendanceStatusAction>>;

/**
 * Renders nothing — runs in the background on every protected page (for
 * employees only) and fires a one-time reminder ~10 minutes before shift end,
 * as both a toast and an OS-level browser notification (so it's visible even
 * if the employee is on a different tab/app, as long as this tab stays open).
 */
export function ShiftEndReminder() {
  const [shiftEndAt, setShiftEndAt] = useState<string | null>(null);
  const now = useServerTime();
  const remindedForRef = useRef<string | null>(null);

  useEffect(() => {
    requestBrowserNotificationPermission();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const status: AttendanceStatus = await getAttendanceStatusAction();
        if (cancelled) return;
        if (status.state === "CHECKED_IN" || status.state === "ON_BREAK") {
          setShiftEndAt(status.shiftEndAt ?? null);
        } else {
          setShiftEndAt(null);
        }
      } catch {
        // transient network hiccup — the next poll will retry
      }
    }

    poll();
    const id = setInterval(poll, STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!shiftEndAt || !now) return;
    if (remindedForRef.current === shiftEndAt) return;

    const minutesLeft = (new Date(shiftEndAt).getTime() - now.getTime()) / 60000;
    if (minutesLeft > 0 && minutesLeft <= REMINDER_MINUTES_BEFORE) {
      remindedForRef.current = shiftEndAt;
      const message = `Your shift ends in about ${Math.ceil(minutesLeft)} minute(s) — don't forget to log out.`;
      toast.message("Shift ending soon", { description: message });
      showBrowserNotification("Shift ending soon", message);
    }
  }, [shiftEndAt, now]);

  return null;
}
