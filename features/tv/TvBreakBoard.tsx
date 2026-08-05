"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Coffee, Droplets, Utensils, Zap } from "lucide-react";
import { useBreakActivity } from "@/lib/hooks/useBreakActivity";
import { playChime, unlockAudio } from "@/lib/audio/beep";
import type { EmployeeOnBreak } from "@/services/attendanceService";
import { useServerTime } from "@/hooks/useServerTime";

const SOUND_ENABLED_KEY = "tvBreakBoard.soundEnabled";

const BREAK_META: Record<string, { label: string; icon: typeof Coffee; color: string; maxMinutes: number }> = {
  LUNCH: { label: "Meal Break", icon: Utensils, color: "bg-orange-500", maxMinutes: 30 },
  WASHROOM: { label: "Bio Break", icon: Droplets, color: "bg-blue-500", maxMinutes: 20 },
  PERSONAL: { label: "Casual Break", icon: Coffee, color: "bg-amber-500", maxMinutes: 10 },
  MEETING: { label: "Super Break", icon: Zap, color: "bg-indigo-500", maxMinutes: 60 },
};

function breakMeta(type: string) {
  return BREAK_META[type] ?? { label: type, icon: Coffee, color: "bg-slate-500", maxMinutes: 30 };
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function ElapsedClock({ startAt, maxMinutes }: { startAt: string | Date; maxMinutes: number }) {
  // Server-synced clock — unaffected by the TV's system clock settings.
  const now = useServerTime();

  if (!now) return <span>--:--</span>;
  const totalSeconds = Math.max(0, Math.floor((now.getTime() - new Date(startAt).getTime()) / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const isOver = totalSeconds > maxMinutes * 60;
  return (
    <span className={`font-mono tabular-nums ${isOver ? "text-rose-400" : ""}`}>
      {m}:{s.toString().padStart(2, "0")}
      {isOver && <span className="ml-1.5 rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">OVER</span>}
    </span>
  );
}

function TodayTotal({ completedMinutes, startAt, allowanceMinutes }: { completedMinutes: number; startAt: string | Date; allowanceMinutes: number | null }) {
  // Server-synced clock — unaffected by the TV's system clock settings.
  const now = useServerTime();

  if (!now) return null;
  const elapsedMinutes = Math.floor(Math.max(0, (now.getTime() - new Date(startAt).getTime()) / 60_000));
  const total = completedMinutes + elapsedMinutes;
  const allowance = allowanceMinutes ?? 60;
  return (
    <span className={`text-xs ${total > allowance ? "text-rose-300" : "text-white/50"}`}>
      {total}/{allowance} min today
    </span>
  );
}

function PersonCard({ person }: { person: EmployeeOnBreak }) {
  const meta = breakMeta(person.type);
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-white/10 p-5 backdrop-blur-sm ring-1 ring-white/10">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-brand-orange-light text-xl font-bold text-white">
          {initials(person.employeeName)}
        </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xl font-semibold text-white">{person.employeeName}</p>
        <p className="truncate text-sm text-white/60">{person.department ?? "—"}</p>
        <TodayTotal
          completedMinutes={person.completedBreakMinutesToday}
          startAt={person.startAt}
          allowanceMinutes={person.breakAllowanceMinutes}
        />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span className={`flex items-center gap-1.5 rounded-full ${meta.color} px-3 py-1 text-xs font-semibold text-white`}>
          <Icon className="size-3.5" /> {meta.label}
        </span>
        <span className="text-lg text-white/70">
          <ElapsedClock startAt={person.startAt} maxMinutes={meta.maxMinutes} />
        </span>
      </div>
    </div>
  );
}

interface Popup {
  key: string;
  kind: "start" | "end";
  person: EmployeeOnBreak;
}

export function TvBreakBoard({ timezone }: { timezone: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [popups, setPopups] = useState<Popup[]>([]);
  // Server-synced clock — unaffected by the TV's system clock settings.
  const now = useServerTime();

  useEffect(() => {
    // Once tapped, remember it — a kiosk TV auto-refreshes/reboots with no
    // one there to tap again, so re-prompting every time would leave it
    // silent indefinitely. Read after mount (not as initial state) so the
    // client's first render matches the server's, avoiding a hydration
    // mismatch on the overlay.
    if (localStorage.getItem(SOUND_ENABLED_KEY) === "1") {
      unlockAudio();
      setSoundEnabled(true);
    }
  }, []);

  function pushPopup(kind: "start" | "end", person: EmployeeOnBreak) {
    const key = `${person.breakId}-${kind}-${Date.now()}`;
    setPopups((prev) => [...prev, { key, kind, person }]);
    if (soundEnabled) playChime();
    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.key !== key));
    }, 6000);
  }

  const onBreak = useBreakActivity(token ? `/api/tv/breaks?token=${encodeURIComponent(token)}` : null, {
    onStart: (person) => pushPopup("start", person),
    onEnd: (person) => pushPopup("end", person),
  });

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-10 text-center text-white">
        <p className="text-xl">
          Missing display token. Open this page with <code>?token=...</code> from Company Settings.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-slate-900 to-slate-950 p-10 text-white">
      {!soundEnabled && (
        <button
          type="button"
          onClick={() => {
            unlockAudio();
            localStorage.setItem(SOUND_ENABLED_KEY, "1");
            setSoundEnabled(true);
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/80 text-center backdrop-blur-sm"
        >
          <span className="text-3xl font-bold">Tap anywhere to enable sound alerts</span>
          <span className="text-white/60">This only needs to be done once when the TV is set up.</span>
        </button>
      )}

      <div className="fixed inset-x-0 top-0 z-40 flex flex-col items-center gap-3 px-6 pt-6">
        {popups.map((p) => {
          const meta = breakMeta(p.person.type);
          return (
            <div
              key={p.key}
              className="w-full max-w-xl animate-in fade-in slide-in-from-top-4 rounded-2xl bg-white px-6 py-4 text-slate-900 shadow-2xl"
            >
              <p className="text-lg font-bold">
                {p.person.employeeName}{" "}
                {p.kind === "start" ? `started a ${meta.label}` : "is back from break"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={200} height={200} unoptimized className="size-24 object-contain" />
          <div>
            <p className="text-2xl font-bold">Guru Digital Advertising</p>
            <p className="text-white/50">Live Break Board</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-4xl font-bold tabular-nums">
            {now?.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              timeZone: timezone,
            }) ?? "--:--:--"}
          </p>
          <p className="text-white/50">
            {now?.toLocaleDateString([], {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
              timeZone: timezone,
            }) ?? ""}
          </p>
        </div>
      </div>

      {onBreak.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
          <p className="text-4xl font-bold">Everyone is working 💪</p>
          <p className="text-lg text-white/50">No one is currently on break.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {onBreak.map((person) => (
            <PersonCard key={person.breakId} person={person} />
          ))}
        </div>
      )}
    </div>
  );
}
