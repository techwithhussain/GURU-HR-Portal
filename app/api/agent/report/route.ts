import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { recordInactivityEvent } from "@/services/inactivityService";
import { z } from "zod";

const schema = z.object({
  employeeId: z.string().min(1),
  pcName: z.string().min(1),
  inactiveFrom: z.string().datetime(),
  inactiveTo: z.string().datetime(),
  durationMin: z.number().int().min(1),
});

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-agent-api-key");
  if (!apiKey || apiKey !== env.AGENT_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 422 });
  }

  try {
    await recordInactivityEvent(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[agent/report] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
