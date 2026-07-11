"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Coffee, Droplets, Utensils, Zap } from "lucide-react";
import { useBreakActivity } from "@/lib/hooks/useBreakActivity";
import { playChime, unlockAudio } from "@/lib/audio/beep";
import type { EmployeeOnBreak } from "@/services/attendanceService";

const BREAK_META: Record<string, { label: string; icon: typeof Coffee; color: string }> = {
  LUNCH: { label: "Meal Break", icon: Utensils, color: "bg-orange-500" },
  WASHROOM: { label: "Bio Break", icon: Droplets, color: "bg-blue-500" },
  PERSONAL: { label: "Casual Break", icon: Coffee, color: "bg-amber-500" },
  MEETING: { label: "Super Break", icon: Zap, color: "bg-indigo-500" },
};

function breakMeta(type: string) {
  return BREAK_META[type] ?? { label: type, icon: Coffee, color: "bg-slate-500" };
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function ElapsedClock({ startAt }: { startAt: string | Date }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <span>--:--</span>;
  const totalSeconds = Math.max(0, Math.floor((now.getTime() - new Date(startAt).getTime()) / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return (
    <span className="font-mono tabular-nums">
      {m}:{s.toString().padStart(2, "0")}
    </span>
  );
}

function PersonCard({ person }: { person: EmployeeOnBreak }) {
  const meta = breakMeta(person.type);
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-white/10 p-5 backdrop-blur-sm ring-1 ring-white/10">
      {person.profileImageUrl ? (
        <Image
          src={`/api/employees/photo/${person.profileImageUrl}`}
          alt=""
          width={64}
          height={64}
          unoptimized
          className="size-16 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-brand-orange-light text-xl font-bold text-white">
          {initials(person.employeeName)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xl font-semibold text-white">{person.employeeName}</p>
        <p className="truncate text-sm text-white/60">{person.department ?? "—"}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span className={`flex items-center gap-1.5 rounded-full ${meta.color} px-3 py-1 text-xs font-semibold text-white`}>
          <Icon className="size-3.5" /> {meta.label}
        </span>
        <span className="text-lg text-white/70">
          <ElapsedClock startAt={person.startAt} />
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

export function TvBreakBoard() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
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
          <Image src="/logo.png" alt="" width={48} height={48} unoptimized className="size-12 object-contain" />
          <div>
            <p className="text-2xl font-bold">Guru Digital Advertising</p>
            <p className="text-white/50">Live Break Board</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-4xl font-bold tabular-nums">
            {now?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) ?? "--:--:--"}
          </p>
          <p className="text-white/50">
            {now?.toLocaleDateString([], { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) ?? ""}
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
