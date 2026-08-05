"use client";

import { useEffect, useRef } from "react";
import { listMyNotificationsAction } from "@/actions/notification.actions";
import {
  requestBrowserNotificationPermission,
  showBrowserNotification,
  playNotificationSound,
} from "@/lib/notifications/browserNotify";
import { notificationPopupTitle, formatNotificationDetails } from "@/lib/notifications/format";

// Kept deliberately infrequent — this runs continuously for every logged-in
// user on every page, so its request rate multiplies across the whole
// company on shared hosting. A ~1 minute delay before a popup appears is fine.
const POLL_MS = 60000;

/**
 * Renders nothing — runs on every protected page (both roles) and pops an OS
 * notification + sound whenever a NEW notification lands (admin announcement,
 * late-login alert, force-logout, etc.), on top of the existing bell icon.
 * Never re-pops notifications that already existed before this mounted.
 */
export function NotificationPopupListener() {
  const lastSeenIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    requestBrowserNotificationPermission();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const list = await listMyNotificationsAction();
        if (cancelled || list.length === 0) return;

        const newestId = list[0].id;
        if (!initializedRef.current) {
          // First load — record the current newest as the baseline so we
          // don't blast every historical notification as a popup on mount.
          lastSeenIdRef.current = newestId;
          initializedRef.current = true;
          return;
        }
        if (newestId === lastSeenIdRef.current) return;

        const lastIndex = list.findIndex((n) => n.id === lastSeenIdRef.current);
        const freshOnes = lastIndex === -1 ? [list[0]] : list.slice(0, lastIndex);
        lastSeenIdRef.current = newestId;

        for (const n of [...freshOnes].reverse()) {
          showBrowserNotification(notificationPopupTitle(n.type, n.payload), formatNotificationDetails(n.type, n.payload));
          playNotificationSound();
        }
      } catch {
        // transient network hiccup — the next poll will retry
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return null;
}
