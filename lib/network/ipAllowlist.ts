import ipaddr from "ipaddr.js";

/**
 * Checks whether `ip` falls inside any of the given CIDR ranges.
 * An empty `cidrs` list means the allowlist is disabled (permissive) —
 * used as the default in dev until real office IP ranges are configured.
 */
export function isIpAllowed(ip: string, cidrs: string[]): boolean {
  if (cidrs.length === 0) return true;

  let parsedIp;
  try {
    parsedIp = ipaddr.process(ip);
  } catch {
    return false;
  }

  for (const cidr of cidrs) {
    try {
      const [rangeAddr, prefixLength] = ipaddr.parseCIDR(cidr);
      if (parsedIp.kind() !== rangeAddr.kind()) continue;
      if (parsedIp.match([rangeAddr, prefixLength])) return true;
    } catch {
      continue;
    }
  }

  return false;
}
