type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const MAX_KEYS = 5000;

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; retryAfterSec: number };

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
      }
      if (buckets.size >= MAX_KEYS) {
        const firstKey = buckets.keys().next().value;
        if (firstKey !== undefined) buckets.delete(firstKey);
      }
    }
    const resetAt = now + WINDOW_MS;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: MAX_PER_WINDOW - 1, resetAt };
  }

  if (existing.count >= MAX_PER_WINDOW) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: MAX_PER_WINDOW - existing.count,
    resetAt: existing.resetAt,
  };
}

export function clientKey(ip: string | undefined): string {
  return ip && ip.length > 0 ? ip : "unknown";
}
