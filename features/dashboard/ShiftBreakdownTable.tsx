"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getShiftBreakdownAction } from "@/actions/dashboard.actions";
import type { ShiftBreakdownRow } from "@/services/dashboardService";

const REFRESH_INTERVAL_MS = 15000;

function formatTimeOfDay(minutesOfDay: number): string {
  const h24 = Math.floor(minutesOfDay / 60) % 24;
  const m = minutesOfDay % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

export function ShiftBreakdownTable({ initialData }: { initialData: ShiftBreakdownRow[] }) {
  const [rows, setRows] = useState(initialData);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const fresh = await getShiftBreakdownAction();
        setRows(fresh);
      } catch {
        // transient network hiccup — the next poll will retry
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="text-base font-semibold">Shifts Right Now</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shift</TableHead>
              <TableHead>Working Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Present</TableHead>
              <TableHead>Late</TableHead>
              <TableHead>Working Now</TableHead>
              <TableHead>On Break</TableHead>
              <TableHead>Absent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.shiftId}>
                <TableCell className="font-medium">{row.shiftName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTimeOfDay(row.startMinutesOfDay)}–{formatTimeOfDay(row.endMinutesOfDay)}
                </TableCell>
                <TableCell>
                  {row.isCurrentlyActive ? (
                    <Badge className="gap-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
                    </Badge>
                  ) : (
                    <Badge variant="outline">Off</Badge>
                  )}
                </TableCell>
                <TableCell>{row.totalEmployees}</TableCell>
                <TableCell className="text-emerald-600">{row.presentToday}</TableCell>
                <TableCell className="text-amber-600">{row.lateToday}</TableCell>
                <TableCell className="font-semibold">{row.workingNow}</TableCell>
                <TableCell className="text-orange-600">{row.onBreakNow}</TableCell>
                <TableCell className="text-red-600">{row.absentToday}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No active shifts configured.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
