/**
 * Minimal in-memory fixed-window rate limiter — no external dependency or
 * Redis needed, which fits this app's single-process Hostinger deployment.
 * State resets on process restart; acceptable at this app's scale (a single
 * small-company internal tool), and still meaningfully raises the cost of
 * scripted credential-stuffing / password-reset spam versus having nothing.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Returns true if the call is allowed, false if the key is over its limit for the current window. */
export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= maxAttempts) return false;

  bucket.count += 1;
  return true;
}

// Periodic sweep so long-lived processes don't accumulate one-off IP entries forever.
const sweeper = setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  },
  10 * 60_000,
);
sweeper.unref();
