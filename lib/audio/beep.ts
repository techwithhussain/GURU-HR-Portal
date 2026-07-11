"use client";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Call once from a user gesture (click/tap) so later programmatic beeps are allowed to play. */
export function unlockAudio(): void {
  const audioCtx = getContext();
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}

export function playBeep(frequency = 880): void {
  const audioCtx = getContext();
  if (!audioCtx) return;

  try {
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch {
    // audio unavailable — ignore, this is a non-critical enhancement
  }
}

/** A friendlier two-note chime for "on break" / "back to work" events. */
export function playChime(): void {
  playBeep(880);
  setTimeout(() => playBeep(1175), 150);
}
