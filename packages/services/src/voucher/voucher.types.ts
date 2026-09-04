import type {
  PaymentMethod,
  Voucher,
  VoucherStatus,
} from "@tz/database";

// =====================================================
// Voucher service types
// =====================================================

export interface VoucherServiceDeps {
  generateVoucherCode: (existing: Set<string>) => string;
  validateVoucherOnRouter?: (voucher: Voucher) => Promise<void>;
  onVoucherActivated?: (voucher: Voucher) => Promise<void>;
  onVoucherExpired?: (voucher: Voucher) => Promise<void>;
  generateRouterUsername?: (opts: { phoneNumber?: string | null; packageName?: string }) => string;
  onVoucherSold?: (voucher: Voucher, opts: { paymentMethod: PaymentMethod; customerId?: string }) => Promise<void>;
}

export type VoucherAction =
  | "generateSingle"
  | "generateBulk"
  | "reserve"
  | "sell"
  | "activate"
  | "disable"
  | "expire"
  | "cancel";

export const ALLOWED_TRANSITIONS: Record<VoucherAction, VoucherStatus[]> = {
  generateSingle: ["GENERATED", "AVAILABLE", "RESERVED", "SOLD", "EXPIRED", "USED"],
  generateBulk: ["GENERATED", "AVAILABLE", "RESERVED", "SOLD", "EXPIRED", "USED"],
  reserve: ["AVAILABLE"],
  sell: ["AVAILABLE", "RESERVED", "SOLD"],
  activate: ["SOLD", "AVAILABLE", "RESERVED"],
  disable: ["GENERATED", "AVAILABLE", "RESERVED", "SOLD", "ACTIVE"],
  expire: ["SOLD", "ACTIVE", "AVAILABLE", "RESERVED"],
  cancel: ["GENERATED", "AVAILABLE", "RESERVED"],
};

export function canTransition(from: VoucherStatus, action: VoucherAction): boolean {
  return ALLOWED_TRANSITIONS[action].includes(from);
}
