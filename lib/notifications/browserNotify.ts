"use client";

/** Best-effort permission request — safe to call even if Notification isn't supported. */
export function requestBrowserNotificationPermission(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {
      // ignore — falls back to in-app toasts only
    });
  }
}

/**
 * Shows an OS-level notification if permission was granted. Works while the
 * tab is open anywhere (background tab, minimized, another app focused) —
 * it does NOT work if the tab/browser has been closed entirely.
 */
export function showBrowserNotification(title: string, body: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/logo.png" });
  } catch {
    // Some browsers throw if called from a background service worker context — ignore.
  }
}

let sharedAudioCtx: AudioContext | null = null;

/**
 * Plays a short synthesized "ding" — no audio file needed, so there's nothing
 * to fail to load. Browsers block audio before any user interaction on the
 * page; since this only ever fires after the user has been navigating the
 * portal, that's already satisfied in practice.
 */
export function playNotificationSound(): void {
  if (typeof window === "undefined") return;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  try {
    const ctx = sharedAudioCtx ?? new Ctor();
    sharedAudioCtx = ctx;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.26);
    });
  } catch {
    // ignore — sound is a nice-to-have, never block on it
  }
}
