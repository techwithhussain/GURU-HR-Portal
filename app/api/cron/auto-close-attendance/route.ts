import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { autoCloseStaleAttendance } from "@/services/attendanceService";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await autoCloseStaleAttendance();
  return NextResponse.json(result);
}
