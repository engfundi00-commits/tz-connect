import { PaymentMethod, PaymentStatus } from "@tz/database";
import type {
  PaymentProvider,
  InitiatePaymentInput,
  InitiatePaymentResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
  WebhookEnvelope,
  WebhookResult,
  GetTransactionStatusResult,
} from "../provider";

// =====================================================
// Airtel Money Adapter
// =====================================================
//
// Requires official Airtel Money API documentation and
// credentials (AIRTEL_API_URL, AIRTEL_CLIENT_ID,
// AIRTEL_CLIENT_SECRET). Adapter is stubbed pending the
// official Tanzanian Airtel Money API contract.

export class AirtelMoneyProvider implements PaymentProvider {
  readonly name = PaymentMethod.AIRTEL_MONEY;

  private getConfig() {
    return process.env.AIRTEL_API_URL &&
      process.env.AIRTEL_CLIENT_ID &&
      process.env.AIRTEL_CLIENT_SECRET
      ? {
          apiUrl: process.env.AIRTEL_API_URL,
          clientId: process.env.AIRTEL_CLIENT_ID,
          clientSecret: process.env.AIRTEL_CLIENT_SECRET,
        }
      : null;
  }

  async initiatePayment(_input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    this.assertConfigured();
    return { success: false, status: PaymentStatus.PENDING, raw: { note: "Airtel Money API not yet wired." } };
  }

  async verifyPayment(_input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    this.assertConfigured();
    return { success: false, status: PaymentStatus.PENDING, raw: { note: "Airtel Money verify not yet wired." } };
  }

  async handleWebhook(envelope: WebhookEnvelope): Promise<WebhookResult> {
    this.assertConfigured();
    return { handled: false, status: PaymentStatus.PENDING, raw: envelope.body };
  }

  async getTransactionStatus(providerTransactionId: string): Promise<GetTransactionStatusResult> {
    this.assertConfigured();
    return { status: PaymentStatus.PENDING, raw: { providerTransactionId } };
  }

  private assertConfigured() {
    if (!this.getConfig()) {
      throw new Error("Airtel Money is not configured. Set AIRTEL_API_URL, AIRTEL_CLIENT_ID, AIRTEL_CLIENT_SECRET.");
    }
  }
}
