"use server";

import * as dashboardService from "@/services/dashboardService";
import { requireSession } from "@/services/sessionService";

export async function getDashboardSummaryAction() {
  const session = await requireSession();
  return dashboardService.getDashboardSummary(session);
}

export async function getEmployeesOnBreakAction() {
  const session = await requireSession();
  return dashboardService.getEmployeesOnBreak(session);
}

export async function getMyDashboardProfileAction() {
  const session = await requireSession();
  return dashboardService.getMyDashboardProfile(session);
}

export async function getMyDashboardStatsAction() {
  const session = await requireSession();
  return dashboardService.getMyDashboardStats(session);
}

export async function getMyAttendanceCalendarAction(year: number, month: number) {
  const session = await requireSession();
  return dashboardService.getMyAttendanceCalendar(session, year, month);
}
