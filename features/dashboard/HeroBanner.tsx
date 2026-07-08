import Image from "next/image";
import { Briefcase, Clock, IdCard } from "lucide-react";

function greeting(): string {
  const hour = new Date().getHours();
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
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

function Pill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-md">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
        {icon}
      </span>
      <div className="leading-tight">
        <p className="text-[10px] text-white/70">{label}</p>
        <p className="text-xs font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

export function HeroBanner({
  fullName,
  employeeCode,
  departmentName,
  shift,
}: {
  fullName: string;
  employeeCode: string;
  departmentName: string | null;
  shift?: { name: string; startMinutesOfDay: number; endMinutesOfDay: number } | null;
}) {
  const firstName = fullName.split(" ")[0];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-orange p-5 text-white shadow-elevated sm:p-6">
      {/* decorative background patterns */}
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-40 size-64 rounded-full bg-brand-orange/30 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-lg space-y-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-[1.7rem]">
              {greeting()}, {firstName}! <span className="inline-block">👋</span>
            </h1>
            <p className="text-xs text-white/80 sm:text-sm">Stay positive, work hard and make it happen.</p>
          </div>
          <div className="flex flex-nowrap gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible">
            <Pill icon={<IdCard className="size-3.5" />} label="Employee ID" value={employeeCode} />
            {departmentName && (
              <Pill icon={<Briefcase className="size-3.5" />} label="Department" value={departmentName} />
            )}
            {shift && (
              <Pill
                icon={<Clock className="size-3.5" />}
                label="Shift"
                value={`${formatTimeOfDay(shift.startMinutesOfDay)} – ${formatTimeOfDay(shift.endMinutesOfDay)}`}
              />
            )}
          </div>
        </div>

        <div className="mx-auto hidden shrink-0 items-center gap-3 sm:flex lg:mx-0">
          <div className="hidden items-center gap-2 md:flex">
            <Image
              src="/logo.png"
              alt=""
              width={32}
              height={32}
              unoptimized
              className="size-7 shrink-0 object-contain drop-shadow-md lg:size-8"
            />
            <div className="leading-tight">
              <p className="text-sm font-extrabold tracking-wide text-white lg:text-base">GURU</p>
              <p className="text-[9px] tracking-widest text-white/70">DIGITAL ADVERTISING</p>
            </div>
          </div>

          <div className="relative shrink-0 self-end">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-2/3 w-2/3 rounded-full bg-white/20 blur-2xl" />
            <Image
              src="/mascot-standing.png"
              alt=""
              width={738}
              height={1600}
              unoptimized
              className="relative h-28 w-auto object-contain object-bottom drop-shadow-2xl sm:h-32 lg:h-36"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
