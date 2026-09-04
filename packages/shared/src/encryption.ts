import crypto from "crypto";

// =====================================================
// Encryption helpers (AES-256-GCM)
// =====================================================
//
// Used to encrypt sensitive configuration stored in the
// database (MikroTik credentials, provider API keys, etc.)
// using an application-level ENCRYPTION_KEY from env.
// The key must be a 32-byte (hex or base64) secret.

function getKey(keyId?: string): Buffer {
  const raw = process.env.ENCRYPTION_KEY || keyId || "";
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not configured");
  }
  // Accept raw 32-char, hex (64 chars), or base64 strings
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  if (raw.length === 32) {
    return Buffer.from(raw, "utf8");
  }
  // base64 decode
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) return decoded;
  throw new Error("ENCRYPTION_KEY must encode a 32-byte key (hex, raw, or base64)");
}

export function encryptValue(plaintext: string, keyId?: string): string {
  const key = getKey(keyId);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptValue(payload: string, keyId?: string): string {
  const key = getKey(keyId);
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted payload");
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
