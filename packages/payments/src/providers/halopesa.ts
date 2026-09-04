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
// HaloPesa Adapter
// =====================================================
//
// Requires official HaloPesa API documentation and
// credentials (HALOPESA_API_URL, HALOPESA_API_KEY).
// Stubbed pending confirmation of the provider's API
// contract.

export class HaloPesaProvider implements PaymentProvider {
  readonly name = PaymentMethod.HALOPESA;

  private getConfig() {
    return process.env.HALOPESA_API_URL && process.env.HALOPESA_API_KEY
      ? { apiUrl: process.env.HALOPESA_API_URL, apiKey: process.env.HALOPESA_API_KEY }
      : null;
  }

  async initiatePayment(_input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    this.assertConfigured();
    return { success: false, status: PaymentStatus.PENDING, raw: { note: "HaloPesa API not yet wired." } };
  }

  async verifyPayment(_input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    this.assertConfigured();
    return { success: false, status: PaymentStatus.PENDING, raw: { note: "HaloPesa verify not yet wired." } };
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
      throw new Error("HaloPesa is not configured. Set HALOPESA_API_URL, HALOPESA_API_KEY.");
    }
  }
}
