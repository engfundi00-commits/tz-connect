import { randomInt } from "crypto";

// =====================================================
// Voucher code generation
// =====================================================
//
// Generates human-friendly, cryptographically secure
// voucher codes. Uses an alphabet that avoids ambiguous
// characters (0/O, 1/I/L).

const DEFAULT_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const DEFAULT_LENGTH = 10;

const GLOBAL_USED = new Set<string>();

export interface VoucherCodeOptions {
  length?: number;
  alphabet?: string;
  prefix?: string;
  separator?: boolean;
  separatorEvery?: number;
}

/**
 * Generate a single cryptographically secure, human-friendly
 * voucher code. Guarantees uniqueness against a provided set
 * of already-used codes plus an in-memory set.
 */
export function generateVoucherCode(
  existingCodes: Set<string>,
  options: VoucherCodeOptions = {}
): string {
  const length = options.length ?? DEFAULT_LENGTH;
  const alphabet: string = options.alphabet ?? DEFAULT_ALPHABET;

  if (alphabet.length < 10) {
    throw new Error("Voucher alphabet must contain at least 10 characters");
  }

  const used = new Set<string>([...GLOBAL_USED, ...existingCodes]);

  let code: string;
  for (;;) {
    code = randomCode(alphabet, length);

    if (options.separator) {
      const every = options.separatorEvery ?? 4;
      code = code.replace(new RegExp(`(.{${every}})(?=.)`, "g"), `$1-`);
    }

    const full = `${options.prefix ?? ""}${code}`;
    if (!used.has(full)) {
      used.add(full);
      GLOBAL_USED.add(full);
      return full;
    }
  }
}

function randomCode(alphabet: string, length: number): string {
  // Rejection sampling for uniform distribution
  const alphabetLen = alphabet.length;
  let result = "";
  for (let i = 0; i < length; i++) {
    result += alphabet[randomInt(alphabetLen)];
  }
  return result;
}

/**
 * Bulk generation. Returns unique codes.
 */
export function generateVoucherCodes(count: number, existing: Set<string>, options?: VoucherCodeOptions): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(generateVoucherCode(new Set([...existing, ...result]), options));
  }
  return result;
}
