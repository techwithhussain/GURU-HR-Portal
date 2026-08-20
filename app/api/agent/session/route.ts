import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getAgentSession } from "@/services/inactivityService";

// GET /api/agent/session?pc=DESKTOP-NAME
// Backward-compatible with v2 agents (same URL, same response shape).
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-agent-api-key");
  if (!apiKey || apiKey !== env.AGENT_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pcName = request.nextUrl.searchParams.get("pc") ?? "unknown";
  try {
    const session = await getAgentSession(pcName);
    return NextResponse.json(session);
  } catch (err) {
    console.error("[agent/session] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
