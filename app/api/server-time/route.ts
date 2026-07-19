import { NextResponse } from "next/server";

/**
 * Returns the current server UTC time.
 * Used by client components to sync their live clock to server time
 * rather than relying on the browser's (potentially wrong) system clock.
 */
export async function GET() {
  return NextResponse.json({ now: new Date().toISOString() });
}
