import { CalendarCheck, Clock, Coffee, Plane, TrendingUp, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
      soft: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: Clock,
      label: "Working Hours",
      value: formatHours(stats.workingMinutesThisMonth),
      sub: "This Month",
      soft: "bg-blue-50 text-blue-600",
    },
    {
      icon: Coffee,
      label: "Break Time",
      value: formatHours(stats.breakMinutesThisMonth),
      sub: "This Month",
      soft: "bg-orange-50 text-orange-600",
    },
    {
      icon: Plane,
      label: "Remaining Leaves",
      value: `${stats.remainingLeaveDaysThisYear}`,
      sub: "This Year",
      soft: "bg-violet-50 text-violet-600",
    },
    {
      icon: Timer,
      label: "Overtime",
      value: formatHours(stats.overtimeMinutesThisMonth),
      sub: "This Month",
      soft: "bg-fuchsia-50 text-fuchsia-600",
    },
    {
      icon: TrendingUp,
      label: "Attendance %",
      value: `${stats.attendancePercent}%`,
      sub: "This Month",
      soft: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map(({ icon: Icon, label, value, sub, soft }) => (
        <Card
          key={label}
          className="group rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03] transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated"
        >
          <CardContent className="space-y-3 py-5">
            <div
              className={`flex size-11 items-center justify-center rounded-2xl ${soft} transition-transform duration-200 group-hover:scale-110`}
            >
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none tracking-tight">{value}</p>
              <p className="mt-1.5 text-xs font-medium text-muted-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground/60">{sub}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
