"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, Coffee } from "lucide-react";
import { getDashboardSummaryAction } from "@/actions/dashboard.actions";
import type { DashboardSummary } from "@/services/dashboardService";

const REFRESH_INTERVAL_MS = 15000;

const STAT_TILES = [
  {
    key: "totalEmployees" as const,
    label: "Total Employees",
    icon: Users,
    gradient: "from-blue-500 to-blue-600",
    glow: "shadow-blue-500/25",
    iconBg: "bg-white/20",
  },
  {
    key: "workingNow" as const,
    label: "Working Now",
    icon: UserCheck,
    gradient: "from-emerald-500 to-emerald-600",
    glow: "shadow-emerald-500/25",
    iconBg: "bg-white/20",
  },
  {
    key: "onBreakNow" as const,
    label: "On Break",
    icon: Coffee,
    gradient: "from-orange-500 to-orange-600",
    glow: "shadow-orange-500/25",
    iconBg: "bg-white/20",
  },
];

export function AdminDashboardStats({ initialData }: { initialData: DashboardSummary }) {
  const [summary, setSummary] = useState(initialData);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const fresh = await getDashboardSummaryAction();
        setSummary(fresh);
      } catch {
        // transient network hiccup — the next poll will retry
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {STAT_TILES.map(({ key, label, icon: Icon, gradient, glow, iconBg }) => (
        <div
          key={key}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg ${glow}`}
        >
          {/* Background decoration */}
          <div className="absolute -right-4 -top-4 size-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -right-2 size-16 rounded-full bg-white/5" />

          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">{label}</p>
              <p className="mt-2 text-4xl font-bold tracking-tight">{summary[key]}</p>
            </div>
            <div className={`flex size-11 items-center justify-center rounded-xl ${iconBg}`}>
              <Icon className="size-5 text-white" />
            </div>
          </div>

          {/* Live indicator for working now */}
          {key === "workingNow" && summary[key] > 0 && (
            <div className="relative mt-3 flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-white" />
              </span>
              <span className="text-xs text-white/80">Live right now</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
