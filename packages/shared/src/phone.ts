// =====================================================
// Tanzanian phone number utilities
// =====================================================
//
// Normalizes a Tanzanian phone number to the canonical
// "07XXXXXXXX" format used throughout the platform and
// by mobile-money providers.

function stripNonDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Normalize a Tanzanian phone number to canonical "07XXXXXXXX".
 *
 * Accepts:
 *   - 07XXXXXXXX
 *   - 7XXXXXXXX
 *   - +2557XXXXXXXX
 *   - 2557XXXXXXXX
 *   - 002557XXXXXXXX
 */
export function normalizeTanzanianPhone(input: string): string | null {
  let digits = stripNonDigits(input);

  if (digits.startsWith("00255")) {
    digits = digits.slice(5);
  } else if (digits.startsWith("255")) {
    digits = digits.slice(3);
  }

  // At this point we expect 9 digits (national, without leading 0)
  if (digits.length === 9 && (digits.startsWith("6") || digits.startsWith("7"))) {
    return `0${digits}`;
  }

  if (digits.length === 10 && digits.startsWith("0") && (digits[1] === "6" || digits[1] === "7")) {
    return digits;
  }

  return null;
}

export function isValidTanzanianPhone(input: string): boolean {
  return normalizeTanzanianPhone(input) !== null;
}

/**
 * Convert a normalized TZ number to the international format
 * used by payment providers (e.g. +2557XXXXXXXX).
 */
export function toInternational(input: string): string {
  const normalized = normalizeTanzanianPhone(input);
  if (!normalized) return input;
  return `+255${normalized.slice(1)}`;
}

/**
 * Mask a phone number for display/audit (never log full numbers).
 */
export function maskPhone(input: string): string {
  const normalized = normalizeTanzanianPhone(input) ?? input;
  if (normalized.length < 5) return "***";
  return `${normalized.slice(0, 4)}****${normalized.slice(-2)}`;
}
