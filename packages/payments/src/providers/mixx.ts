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
// Mixx by Yas Adapter
// =====================================================
//
// Requires official Mixx by Yas API documentation and
// credentials (MIXX_API_URL, MIXX_CLIENT_ID,
// MIXX_CLIENT_SECRET). Stubbed pending confirmation of the
// provider's API contract.

export class MixxByYasProvider implements PaymentProvider {
  readonly name = PaymentMethod.MIXX_BY_YAS;

  private getConfig() {
    return process.env.MIXX_API_URL && process.env.MIXX_CLIENT_ID && process.env.MIXX_CLIENT_SECRET
      ? {
          apiUrl: process.env.MIXX_API_URL,
          clientId: process.env.MIXX_CLIENT_ID,
          clientSecret: process.env.MIXX_CLIENT_SECRET,
        }
      : null;
  }

  async initiatePayment(_input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    this.assertConfigured();
    return { success: false, status: PaymentStatus.PENDING, raw: { note: "Mixx by Yas API not yet wired." } };
  }

  async verifyPayment(_input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    this.assertConfigured();
    return { success: false, status: PaymentStatus.PENDING, raw: { note: "Mixx by Yas verify not yet wired." } };
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
      throw new Error("Mixx by Yas is not configured. Set MIXX_API_URL, MIXX_CLIENT_ID, MIXX_CLIENT_SECRET.");
    }
  }
}
