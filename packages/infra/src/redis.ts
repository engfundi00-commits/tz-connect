import Redis from "ioredis";
import { logger } from "@tz/shared";

// =====================================================
// Redis Client Abstraction
// =====================================================
//
// Exposes a clean, resilient Redis client. Connection
// errors are surfaced via events and logged, but never
// crash the application — individual calls that fail due
// to Redis unavailability return errors to callers, which
// may fall back to in-memory behavior where safe.
//
// PRODUCTION: set REDIS_URL to a real Redis (or cluster).
// RECOMMENDED PRODUCTION REDIS URL:
//   redis://:password@redis-host:6379/0
//
// For multi-instance deployments REDIS is the shared,
// authoritative state for rate limiting and idempotency.

let client: Redis | null = null;
let clientError: Error | null = null;

export type RedisClient = Redis;

export function getRedis(): RedisClient {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not configured. Set REDIS_URL to enable Redis-backed state.");
  }

  client = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 100, 2000),
    lazyConnect: false,
  });

  client.on("error", (err) => {
    clientError = err;
    logger.warn("Redis client error (application continues)", { error: err.message });
  });
  client.on("ready", () => {
    clientError = null;
    logger.info("Redis connected");
  });
  client.on("connect", () => logger.info("Redis connecting..."));

  return client;
}

export function getRedisError(): Error | null {
  return clientError;
}

export async function isRedisHealthy(): Promise<boolean> {
  try {
    const c = getRedis();
    const pong = await c.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}
