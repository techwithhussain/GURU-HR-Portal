import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { heartbeatPcSession } from "@/services/inactivityService";

// GET /api/agent/heartbeat?pc=DESKTOP-NAME&v=3.0
// Called by desktop agent v3 every 30 seconds.
// Updates lastHeartbeatAt and returns current session info.
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-agent-api-key");
  if (!apiKey || apiKey !== env.AGENT_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pcName = request.nextUrl.searchParams.get("pc") ?? "unknown";
  const agentVersion = request.nextUrl.searchParams.get("v") ?? undefined;

  try {
    const session = await heartbeatPcSession(pcName, agentVersion);
    return NextResponse.json(session);
  } catch (err) {
    console.error("[agent/heartbeat] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
