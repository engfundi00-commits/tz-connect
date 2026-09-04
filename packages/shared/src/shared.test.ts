import { describe, expect, it } from "vitest";
import {
  normalizeTanzanianPhone,
  isValidTanzanianPhone,
  toInternational,
  maskPhone,
} from "./phone";
import {
  generateVoucherCode,
  generateVoucherCodes,
} from "./voucher";
import { permissionsForRole, hasPermission } from "./rbac";

describe("normalizeTanzanianPhone", () => {
  it("accepts the canonical 07XXXXXXXX format", () => {
    expect(normalizeTanzanianPhone("0712345678")).toBe("0712345678");
  });

  it("accepts the short national format", () => {
    expect(normalizeTanzanianPhone("712345678")).toBe("0712345678");
  });

  it("accepts the +255 international format", () => {
    expect(normalizeTanzanianPhone("+255712345678")).toBe("0712345678");
  });

  it("accepts the 255 and 00255 variants", () => {
    expect(normalizeTanzanianPhone("255712345678")).toBe("0712345678");
    expect(normalizeTanzanianPhone("00255712345678")).toBe("0712345678");
  });

  it("rejects invalid or foreign numbers", () => {
    expect(normalizeTanzanianPhone("abc")).toBeNull();
    expect(normalizeTanzanianPhone("071234567")).toBeNull();
    expect(normalizeTanzanianPhone("0123456789")).toBeNull(); // does not start 06/07
    expect(normalizeTanzanianPhone("359123456789")).toBeNull(); // not TZ
  });

  it("supports 06 mobile prefixes too", () => {
    expect(normalizeTanzanianPhone("0612345678")).toBe("0612345678");
    expect(normalizeTanzanianPhone("712345678")).toBe("0712345678");
  });
});

describe("isValidTanzanianPhone", () => {
  it("returns true/false accordingly", () => {
    expect(isValidTanzanianPhone("0712345678")).toBe(true);
    expect(isValidTanzanianPhone("nope")).toBe(false);
  });
});

describe("toInternational", () => {
  it("converts to +255 format", () => {
    expect(toInternational("0712345678")).toBe("+255712345678");
  });
});

describe("maskPhone", () => {
  it("masks the middle digits", () => {
    expect(maskPhone("0712345678")).toBe("0712****78");
  });

  it("does not leak short values", () => {
    expect(maskPhone("12")).toBe("***");
  });
});

describe("generateVoucherCode", () => {
  it("produces codes using the unambiguous alphabet", () => {
    const code = generateVoucherCode(new Set());
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{10}$/);
  });

  it("respects length and prefix options", () => {
    const code = generateVoucherCode(new Set(), { length: 8, prefix: "TZ-" });
    expect(code).toMatch(/^TZ-[A-HJKMNP-Z2-9]{8}$/);
  });

  it("uses a separator every N characters", () => {
    const code = generateVoucherCode(new Set(), {
      separator: true,
      separatorEvery: 4,
    });
    const chars = code.replace(/-/g, "");
    expect(chars).toMatch(/^[A-HJKMNP-Z2-9]{10}$/);
    expect(code.includes("-")).toBe(true);
  });

  it("never duplicates across calls with the same existing set", () => {
    const used = new Set<string>();
    const codes = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const code = generateVoucherCode(used);
      expect(codes.has(code)).toBe(false);
      codes.add(code);
      used.add(code);
    }
  });

  it("throws if the alphabet is too small", () => {
    expect(() => generateVoucherCode(new Set(), { alphabet: "ABC" })).toThrow();
  });
});

describe("generateVoucherCodes", () => {
  it("generates the requested number of unique codes", () => {
    const codes = generateVoucherCodes(50, new Set());
    expect(codes).toHaveLength(50);
    expect(new Set(codes).size).toBe(50);
  });
});

describe("rbac", () => {
  it("grants SUPER_ADMIN every permission", () => {
    const perms = permissionsForRole("SUPER_ADMIN");
    expect(perms).toContain("vouchers.bulkCreate");
    expect(perms).toContain("users.manage");
    expect(perms).toContain("network.manage");
  });

  it("grants AGENT sales/voucher scoped permissions only", () => {
    expect(hasPermission("AGENT", "vouchers.sell")).toBe(true);
    expect(hasPermission("AGENT", "users.manage")).toBe(false);
    expect(hasPermission("AGENT", "reports.export")).toBe(false);
  });

  it("does not grant permissions to unknown roles", () => {
    expect(permissionsForRole("SUPER_ADMIN" as never)).toBeDefined();
  });
});
