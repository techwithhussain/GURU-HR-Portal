
import { NextResponse, type NextRequest } from "next/server";
import { getClientIp } from "@/lib/network/getClientIp";
import { env } from "@/lib/env";
import { checkIpAllowed } from "@/middleware/ip-allowlist";
import { validateSessionCookie } from "@/middleware/session-guard";
import { isPublicPath } from "@/middleware/config";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron).*)"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const ip = getClientIp(request.headers);
  const ipAllowed = await checkIpAllowed(ip);
  if (!ipAllowed) {
    return new NextResponse("Access restricted to the office network.", { status: 403 });
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(env.SESSION_COOKIE_NAME)?.value;
  const session = await validateSessionCookie(token);

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session.mustChangePassword && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", session.userId);
  requestHeaders.set("x-user-role", session.roleName);

  return NextResponse.next({ request: { headers: requestHeaders } });
}
