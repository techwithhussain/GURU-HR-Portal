import { env } from "@/lib/env";

/**
 * Resolves the real client IP from a request that has passed through
 * `TRUSTED_PROXY_HOPS` reverse proxies (e.g. Hostinger's proxy in front of the app).
 *
 * `x-forwarded-for` is a client-appendable header: `client, proxy1, proxy2, ...`.
 * Only the entry written by our own trusted proxy chain can be trusted — a client
 * can prepend arbitrary fake hops before it. With N trusted hops, the real client
 * IP is the (N)th-from-the-end entry.
 */
export function getClientIp(headers: Headers): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  const hops = env.TRUSTED_PROXY_HOPS;

  if (forwardedFor) {
    const parts = forwardedFor
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length > 0) {
      const index = Math.max(0, parts.length - hops);
      return parts[index] ?? parts[0];
    }
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return null;
}
