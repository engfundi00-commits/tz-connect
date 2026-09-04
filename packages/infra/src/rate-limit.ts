import { isRedisConfigured, getRedis } from "./redis";
import { logger } from "@tz/shared";

// =====================================================
// Distributed / Shared-State Rate Limiting
// =====================================================
//
// PRODUCTION: uses Redis (shared state) so limits are
// enforced consistently across multiple instances.
//
// DEVELOPMENT FALLBACK: if REDIS_URL is not configured
// (or Redis is unreachable), falls back to an in-memory
// limiter. This is explicitly a local-development fallback
// ONLY — in a multi-instance production deployment you
// MUST configure REDIS_URL. The mode is surfaced clearly.

export type RateLimitMode = "REDIS" | "IN_MEMORY";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
  limit: number;
  mode: RateLimitMode;
}

// --- In-memory fallback (dev only) ---
interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

function memoryCheck(key: string, windowMs: number, max: number): Omit<RateLimitResult, "mode"> {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, limit: max };
  }
  existing.count += 1;
  if (existing.count > max) {
    return { allowed: false, remaining: 0, retryAfterMs: existing.resetAt - now, limit: max };
  }
  return { allowed: true, remaining: max - existing.count, limit: max };
}

// --- Redis fixed-window limiter ---
async function redisCheck(
  key: string,
  windowMs: number,
  max: number
): Promise<Omit<RateLimitResult, "mode">> {
  const redis = getRedis();
  const now = Date.now();
  const windowKey = Math.floor(now / windowMs) * windowMs;
  const fullKey = `rl:${windowKey}:${key}`;

  const batch = redis.multi();
  batch.incr(fullKey);
  batch.pexpire(fullKey, windowMs);
  const results = await batch.exec();
  if (!results) throw new Error("redis batch failed");
  const count = Number(results[0]?.[1] ?? 0);

  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    retryAfterMs: count > max ? windowMs - (now - windowKey) : undefined,
    limit: max,
  };
}

export interface RateLimitOptions {
  key: string;
  windowMs?: number;
  max?: number;
}

export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const windowMs = opts.windowMs ?? 60000;
  const max = opts.max ?? 100;

  if (isRedisConfigured()) {
    try {
      const result = await redisCheck(opts.key, windowMs, max);
      return { ...result, mode: "REDIS" };
    } catch (e) {
      logger.warn("Redis rate-limit failed, falling back to in-memory (dev only)", {
        error: (e as Error).message,
      });
    }
  }

  // Dev fallback
  return { ...memoryCheck(opts.key, windowMs, max), mode: "IN_MEMORY" };
}

/**
 * Idempotency guard backed by Redis when available,
 * otherwise an in-memory set. Returns true if this key has
 * NOT been seen within the window (i.e. should proceed).
 */
export async function acquireIdempotencyLock(
  key: string,
  ttlMs = 300000
): Promise<{ acquired: boolean; owner: string }> {
  const owner = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const res = await redis.set(`lock:${key}`, owner, "PX", ttlMs, "NX");
      return { acquired: res === "OK", owner };
    } catch (e) {
      logger.warn("Redis lock failed, falling back to in-memory", { error: (e as Error).message });
    }
  }

  // Dev fallback (process-local)
  const now = Date.now();
  const existing = memoryLocks.get(key);
  if (existing && existing > now) {
    return { acquired: false, owner };
  }
  memoryLocks.set(key, now + ttlMs);
  return { acquired: true, owner };
}

const memoryLocks = new Map<string, number>();

