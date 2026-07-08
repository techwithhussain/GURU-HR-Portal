import { describe, expect, it } from "vitest";
import { isIpAllowed } from "@/lib/network/ipAllowlist";

describe("isIpAllowed", () => {
  it("allows any IP when the allowlist is empty (disabled)", () => {
    expect(isIpAllowed("8.8.8.8", [])).toBe(true);
  });

  it("allows an IP inside a configured CIDR range", () => {
    expect(isIpAllowed("203.0.113.42", ["203.0.113.0/24"])).toBe(true);
  });

  it("rejects an IP outside all configured CIDR ranges", () => {
    expect(isIpAllowed("8.8.8.8", ["203.0.113.0/24"])).toBe(false);
  });

  it("matches an exact /32 host range", () => {
    expect(isIpAllowed("203.0.113.42", ["203.0.113.42/32"])).toBe(true);
    expect(isIpAllowed("203.0.113.43", ["203.0.113.42/32"])).toBe(false);
  });

  it("supports IPv6 CIDR ranges", () => {
    expect(isIpAllowed("2001:db8::1", ["2001:db8::/32"])).toBe(true);
    expect(isIpAllowed("2001:dead::1", ["2001:db8::/32"])).toBe(false);
  });

  it("rejects malformed IPs safely instead of throwing", () => {
    expect(isIpAllowed("not-an-ip", ["203.0.113.0/24"])).toBe(false);
  });

  it("ignores malformed CIDR entries and still checks the rest", () => {
    expect(isIpAllowed("203.0.113.42", ["not-a-cidr", "203.0.113.0/24"])).toBe(true);
  });
});
