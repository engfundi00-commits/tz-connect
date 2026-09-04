// =====================================================
// Structured logging
// =====================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentLevel(): LogLevel {
  const configured = (process.env.LOG_LEVEL as LogLevel) ?? "info";
  return LEVELS[configured] !== undefined ? configured : "info";
}

function timestamp(): string {
  return new Date().toISOString();
}

function emit(level: LogLevel, message: string, meta?: unknown) {
  if (LEVELS[level] < LEVELS[currentLevel()]) return;
  const entry: Record<string, unknown> = {
    timestamp: timestamp(),
    level,
    message,
  };
  if (meta !== undefined) entry.meta = meta;
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, meta?: unknown) => emit("debug", msg, meta),
  info: (msg: string, meta?: unknown) => emit("info", msg, meta),
  warn: (msg: string, meta?: unknown) => emit("warn", msg, meta),
  error: (msg: string, meta?: unknown) => emit("error", msg, meta),
};

/**
 * Generate a request/error correlation ID.
 */
export function newId(prefix = "req"): string {
  const crypto = require("crypto");
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

export function newErrorId(): string {
  return newId("err");
}
