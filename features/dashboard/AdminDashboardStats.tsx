"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSummaryAction } from "@/actions/dashboard.actions";
import type { DashboardSummary } from "@/services/dashboardService";

const REFRESH_INTERVAL_MS = 15000;

const STAT_TILES = [
  { key: "totalEmployees", label: "Total Employees" },
  { key: "presentToday", label: "Present Today" },
  { key: "lateToday", label: "Late Today" },
  { key: "onBreakNow", label: "On Break" },
  { key: "workingNow", label: "Working Now" },
  { key: "checkedOutToday", label: "Logged Out" },
  { key: "absentToday", label: "Absent Today" },
] as const;

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
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {STAT_TILES.map(({ key, label }) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{summary[key]}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
