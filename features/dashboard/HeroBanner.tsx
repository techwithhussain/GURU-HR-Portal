import Image from "next/image";
import { Briefcase, CalendarDays, Clock, IdCard, PartyPopper, Sparkles } from "lucide-react";
import { ShiftProgress } from "@/features/dashboard/ShiftProgress";

function greeting(timezone: string): string {
  // Use the company's configured timezone (IST) to determine the greeting,
  // not the server's local clock which may be running in UTC.
  const hourStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: timezone,
  }).format(new Date());
  const hour = parseInt(hourStr, 10);
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Good Night";
}

function formatTimeOfDay(minutesOfDay: number): string {
  const h24 = Math.floor(minutesOfDay / 60) % 24;
  const m = minutesOfDay % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  // Non-breaking space between the time and AM/PM — keeps "9:00 AM" as one
  // unit so a card never wraps and leaves "AM"/"PM" orphaned on its own line.
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

function todayLabel(timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date());
}

/** Returns years of service if today is the work anniversary, else null */
function workAnniversaryYears(joiningDate: Date, timezone: string): number | null {
  const today = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date());
  const [todayMonth, todayDay, todayYear] = today.split("/").map(Number);
  const joined = new Date(joiningDate);
  const joinMonth = joined.getMonth() + 1;
  const joinDay = joined.getDate();
  const joinYear = joined.getFullYear();
  if (todayMonth === joinMonth && todayDay === joinDay && todayYear > joinYear) {
    return todayYear - joinYear;
  }
  return null;
}

/** Returns true if today is the employee's birthday */
function isBirthday(dateOfBirth: Date, timezone: string): boolean {
  const today = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).format(new Date());
  const [todayMonth, todayDay] = today.split("/").map(Number);
  const dob = new Date(dateOfBirth);
  return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay;
}

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: "orange" | "blue" | "violet";
}) {
  const tintClass = {
    orange: "bg-brand-orange/15 text-brand-orange-light",
    blue: "bg-sky-400/15 text-sky-300",
    violet: "bg-violet-400/15 text-violet-300",
  }[tint];

  return (
    <div className="flex h-full min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2.5 sm:gap-2.5 sm:px-3">
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg sm:size-8 ${tintClass}`}>{icon}</span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[10px] text-white/50 sm:text-[11px]">{label}</p>
        <p className="whitespace-nowrap text-[11px] font-semibold text-white sm:text-xs">{value}</p>
      </div>
    </div>
  );
}

export function HeroBanner({
  fullName,
  employeeCode,
  departmentName,
  shift,
  timezone,
  joiningDate,
  dateOfBirth,
}: {
  fullName: string;
  employeeCode: string;
  departmentName: string | null;
  shift?: { name: string; startMinutesOfDay: number; endMinutesOfDay: number } | null;
  timezone: string;
  joiningDate?: Date | null;
  dateOfBirth?: Date | null;
}) {
  const firstName = fullName.split(" ")[0];
  const anniversaryYears = joiningDate ? workAnniversaryYears(joiningDate, timezone) : null;
  const todayIsBirthday = dateOfBirth ? isBirthday(dateOfBirth, timezone) : false;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-orange/40 bg-[#0b0f1a] p-5 shadow-elevated sm:p-6 lg:p-8">
      {/* GURU logo — top-right corner */}
      <div className="pointer-events-none absolute right-5 top-5 z-20 hidden flex-col items-center gap-1 sm:flex">
        <Image
          src="/logo.png"
          alt="GURU Digital Advertising"
          width={500}
          height={500}
          unoptimized
          className="size-10 object-contain drop-shadow-[0_0_14px_rgba(255,102,0,0.45)] lg:size-12"
        />
        <div className="text-center leading-tight">
          <p className="text-sm font-extrabold tracking-wide text-white lg:text-base">GURU</p>
          <p className="text-[9px] tracking-[0.18em] text-white/50">
            DIGITAL <span className="text-brand-orange">ADVERTISING</span>
          </p>
        </div>
      </div>
      {/* decorative dot grid */}
      <div className="pointer-events-none absolute left-6 top-6 grid grid-cols-6 gap-2 opacity-30 sm:grid-cols-8">
        {Array.from({ length: 32 }).map((_, i) => (
          <span key={i} className="size-1 rounded-full bg-brand-orange" />
        ))}
      </div>

      {/* faint watermark logo */}
      <Image
        src="/logo.png"
        alt=""
        width={500}
        height={500}
        unoptimized
        className="pointer-events-none absolute -right-16 top-1/2 hidden size-[22rem] -translate-y-1/2 opacity-[0.05] sm:block"
      />

      {/* glow accent */}
      <div className="pointer-events-none absolute bottom-0 right-0 h-40 w-2/3 bg-gradient-to-tl from-brand-orange/25 via-transparent to-transparent blur-2xl" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-orange-light">Welcome Back,</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-[1.7rem]">
              {greeting(timezone)}, {firstName}! <span className="inline-block">👋</span>
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Stay focused, stay positive, and keep making great things happen.
            </p>
          </div>

          {/* Birthday > Anniversary > Normal badge */}
          {todayIsBirthday ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-400/40 bg-pink-400/10 px-4 py-1.5 text-xs font-medium text-pink-300">
              <span>🎂</span> Happy Birthday, {firstName}! Wishing you a wonderful day!
            </div>
          ) : anniversaryYears !== null ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs font-medium text-amber-300">
              <PartyPopper className="size-3.5" />
              🎉 Happy {anniversaryYears} Year{anniversaryYears > 1 ? "s" : ""} Work Anniversary, {firstName}!
            </div>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-orange/40 px-4 py-1.5 text-xs font-medium text-brand-orange-light">
              <Sparkles className="size-3.5" /> You&apos;re doing great today!
            </span>
          )}

          <div className="grid grid-cols-3 items-stretch gap-2 sm:gap-2.5">
            <StatCard icon={<IdCard className="size-4" />} label="Employee ID" value={employeeCode} tint="orange" />
            <StatCard
              icon={<Briefcase className="size-4" />}
              label="Department"
              value={departmentName ?? "—"}
              tint="blue"
            />
            <StatCard
              icon={<Clock className="size-4" />}
              label="Shift Timing"
              value={shift ? `${formatTimeOfDay(shift.startMinutesOfDay)} – ${formatTimeOfDay(shift.endMinutesOfDay)}` : "—"}
              tint="violet"
            />
          </div>

          {/* Shift Progress Bar */}
          {shift && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <ShiftProgress
                startMinutesOfDay={shift.startMinutesOfDay}
                endMinutesOfDay={shift.endMinutesOfDay}
                timezone={timezone}
              />
            </div>
          )}

          <div className="flex w-fit flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white/70">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <CalendarDays className="size-3.5 text-brand-orange" /> {todayLabel(timezone)}
            </span>
            <span className="h-3 w-px shrink-0 bg-white/15" />
            <span className="flex items-center gap-1.5 whitespace-nowrap font-medium text-emerald-400">
              <span className="size-2 shrink-0 animate-pulse rounded-full bg-emerald-400" /> Online
            </span>
          </div>
        </div>


      </div>
    </div>
  );
}
