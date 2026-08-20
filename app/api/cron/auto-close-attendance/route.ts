import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { autoCloseStaleAttendance } from "@/services/attendanceService";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secretParam = request.nextUrl.searchParams.get("secret");
  const authHeader = request.headers.get("authorization");
  if (!env.CRON_SECRET) return true; // If no secret configured, allow execution
  return authHeader === `Bearer ${env.CRON_SECRET}` || secretParam === env.CRON_SECRET;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await autoCloseStaleAttendance();
  return NextResponse.json({ success: true, ...result });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await autoCloseStaleAttendance();
  return NextResponse.json({ success: true, ...result });
}
