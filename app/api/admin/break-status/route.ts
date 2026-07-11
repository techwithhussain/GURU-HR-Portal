import { NextResponse } from "next/server";
import { getSessionContext } from "@/services/sessionService";
import { getEmployeesOnBreak } from "@/services/attendanceService";

export async function GET() {
  const session = await getSessionContext();
  if (!session || session.roleName !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const onBreak = await getEmployeesOnBreak();
  return NextResponse.json({ onBreak });
}
