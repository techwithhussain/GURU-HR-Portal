import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { TRUSTED_PROXY_HOPS: 1 } }));

const { getClientIp } = await import("@/lib/network/getClientIp");

function headersWith(xff?: string, xRealIp?: string): Headers {
  const h = new Headers();
  if (xff) h.set("x-forwarded-for", xff);
  if (xRealIp) h.set("x-real-ip", xRealIp);
  return h;
}

describe("getClientIp", () => {
  it("with one trusted hop, trusts the last entry (appended by our proxy)", () => {
    // "<whatever the client sent>, <IP our trusted proxy saw connect to it>"
    expect(getClientIp(headersWith("198.51.100.9, 203.0.113.5"))).toBe("203.0.113.5");
  });

  it("ignores an arbitrary number of client-spoofed entries before our proxy's hop", () => {
    // a client can prepend as many fake entries as it wants; only the last
    // entry (written by our one trusted proxy) is authoritative
    expect(getClientIp(headersWith("6.6.6.6, 198.51.100.9, 203.0.113.5"))).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    expect(getClientIp(headersWith(undefined, "198.51.100.9"))).toBe("198.51.100.9");
  });

  it("returns null when no IP headers are present", () => {
    expect(getClientIp(headersWith())).toBeNull();
  });

  it("handles a single-hop header without over-indexing", () => {
    expect(getClientIp(headersWith("203.0.113.5"))).toBe("203.0.113.5");
  });
});
