import { PaymentMethod } from "@tz/database";
import type { PaymentProvider } from "./provider";
import { MpesaProvider } from "./providers/mpesa";
import { AirtelMoneyProvider } from "./providers/airtel";
import { MixxByYasProvider } from "./providers/mixx";
import { HaloPesaProvider } from "./providers/halopesa";
import { MockPaymentProvider } from "./providers/mock";

// =====================================================
// Payment Provider Factory
// =====================================================
//
// Returns a provider for a given payment method.
// If PAYMENT_MODE=mock (development/test), returns the
// mock provider. Otherwise returns the configured real
// provider adapter. Cash is handled separately (manual).

export type PaymentMode = "mock" | "live";

export function isMockMode(): boolean {
  return (process.env.PAYMENT_MODE || "mock") === "mock";
}

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  if (isMockMode()) {
    return new MockPaymentProvider();
  }

  switch (method) {
    case PaymentMethod.MPESA:
      return new MpesaProvider();
    case PaymentMethod.AIRTEL_MONEY:
      return new AirtelMoneyProvider();
    case PaymentMethod.MIXX_BY_YAS:
      return new MixxByYasProvider();
    case PaymentMethod.HALOPESA:
      return new HaloPesaProvider();
    default:
      throw new Error(`No provider for payment method: ${method}`);
  }
}
