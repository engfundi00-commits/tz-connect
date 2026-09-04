// =====================================================
// Rate limiting
// =====================================================
//
// In-memory implementation for single-instance dev/test.
// Swap for a Redis-backed limiter in production (the
// interface is identical). Used for auth brute-force
// protection and payment endpoints.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function cleanup() {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

export function rateLimit(opts: {
  key: string;
  windowMs?: number;
  max?: number;
}): { allowed: boolean; retryAfterMs?: number; remaining: number } {
  const windowMs = opts.windowMs ?? 60000;
  const max = opts.max ?? 100;
  cleanup();

  const now = Date.now();
  const existing = buckets.get(opts.key);
  if (!existing || existing.resetAt < now) {
    buckets.set(opts.key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  existing.count += 1;
  if (existing.count > max) {
    return { allowed: false, retryAfterMs: existing.resetAt - now, remaining: 0 };
  }
  return { allowed: true, remaining: max - existing.count };
}
