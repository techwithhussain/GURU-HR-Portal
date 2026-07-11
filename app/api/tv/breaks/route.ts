import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getEmployeesOnBreak } from "@/services/attendanceService";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token !== env.TV_DISPLAY_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const onBreak = await getEmployeesOnBreak();
  return NextResponse.json({ onBreak });
}
