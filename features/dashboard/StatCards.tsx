import { CalendarCheck, Clock, Coffee, Plane, TrendingUp, Timer } from "lucide-react";
import type { MyDashboardStats } from "@/services/dashboardService";

function formatHours(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function StatCards({ stats }: { stats: MyDashboardStats }) {
  const tiles = [
    {
      icon: CalendarCheck,
      label: "Present Days",
      value: `${stats.presentDaysThisMonth}/${stats.workingDaysElapsedThisMonth}`,
      sub: "This Month",
      gradient: "from-emerald-500 to-emerald-600",
      glow: "group-hover:shadow-emerald-500/20",
      iconBg: "bg-emerald-50 text-emerald-600",
      accent: "bg-emerald-500",
    },
    {
      icon: Clock,
      label: "Working Hours",
      value: formatHours(stats.workingMinutesThisMonth),
      sub: "This Month",
      gradient: "from-blue-500 to-blue-600",
      glow: "group-hover:shadow-blue-500/20",
      iconBg: "bg-blue-50 text-blue-600",
      accent: "bg-blue-500",
    },
    {
      icon: Coffee,
      label: "Break Time",
      value: formatHours(stats.breakMinutesThisMonth),
      sub: "This Month",
      gradient: "from-orange-500 to-orange-600",
      glow: "group-hover:shadow-orange-500/20",
      iconBg: "bg-orange-50 text-orange-600",
      accent: "bg-orange-500",
    },
    {
      icon: Plane,
      label: "Remaining Leaves",
      value: `${stats.remainingLeaveDaysThisYear}`,
      sub: "This Year",
      gradient: "from-violet-500 to-violet-600",
      glow: "group-hover:shadow-violet-500/20",
      iconBg: "bg-violet-50 text-violet-600",
      accent: "bg-violet-500",
    },
    {
      icon: Timer,
      label: "Overtime",
      value: formatHours(stats.overtimeMinutesThisMonth),
      sub: "This Month",
      gradient: "from-fuchsia-500 to-fuchsia-600",
      glow: "group-hover:shadow-fuchsia-500/20",
      iconBg: "bg-fuchsia-50 text-fuchsia-600",
      accent: "bg-fuchsia-500",
    },
    {
      icon: TrendingUp,
      label: "Attendance %",
      value: `${stats.attendancePercent}%`,
      sub: "This Month",
      gradient: "from-amber-500 to-amber-600",
      glow: "group-hover:shadow-amber-500/20",
      iconBg: "bg-amber-50 text-amber-600",
      accent: "bg-amber-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map(({ icon: Icon, label, value, sub, glow, iconBg, accent }) => (
        <div
          key={label}
          className={`group relative overflow-hidden rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/[0.04] transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated ${glow}`}
        >
          {/* Colored top accent bar */}
          <div className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} />

          {/* Icon */}
          <div
            className={`mb-3 flex size-10 items-center justify-center rounded-xl ${iconBg} transition-transform duration-200 group-hover:scale-110`}
          >
            <Icon className="size-4.5" />
          </div>

          {/* Value */}
          <p className="text-lg font-bold leading-none tracking-tight text-foreground sm:text-xl">
            {value}
          </p>
          <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground/50">{sub}</p>
        </div>
      ))}
    </div>
  );
}
