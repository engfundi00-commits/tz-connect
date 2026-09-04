export * from "./rbac";
export * from "./validation";
export * from "./phone";
export * from "./voucher";
export * from "./logger";
export * from "./encryption";

export function formatCurrency(amount: number, currency = "TZS"): string {
  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function bytesToMegabytes(bytes: bigint | number): number {
  return Number(bytes) / (1024 * 1024);
}

export function megabytesToBytes(mb: number): bigint {
  return BigInt(Math.round(mb * 1024 * 1024));
}
