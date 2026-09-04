import {
  PaymentMethod,
  PaymentStatus,
} from "@tz/database";
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
// M-Pesa (Daraja API) Adapter
// =====================================================
//
// Tanzania M-Pesa via Safaricom Daraja-style API.
// Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET,
// MPESA_PASSKEY, MPESA_SHORTCODE.
//
// NOTE: Payment provider configuration/credentials come
// from environment variables. The adapter is production
// structured, but the actual live API contract for the
// Tanzanian operator must be confirmed before enabling.

export class MpesaProvider implements PaymentProvider {
  readonly name = PaymentMethod.MPESA;

  private getConfig() {
    const apiUrl = process.env.MPESA_API_URL;
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;

    if (!apiUrl || !consumerKey || !consumerSecret || !shortcode || !passkey) {
      return null;
    }
    return { apiUrl, consumerKey, consumerSecret, shortcode, passkey };
  }

  async initiatePayment(_input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    this.assertConfigured();
    // Real Daraja STK Push call would go here.
    return {
      success: false,
      status: PaymentStatus.PENDING,
      raw: {
        note: "M-Pesa STK Push not yet wired to live Daraja endpoint. Configure MPESA_* env vars and implement.",
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    this.assertConfigured();
    return {
      success: false,
      status: PaymentStatus.PENDING,
      providerTransactionId: input.providerTransactionId,
      raw: { note: "M-Pesa verification requires live API credentials." },
    };
  }

  async handleWebhook(envelope: WebhookEnvelope): Promise<WebhookResult> {
    this.assertConfigured();
    // Validate signature + body, verify transaction, return status.
    return {
      handled: false,
      status: PaymentStatus.PENDING,
      raw: envelope.body,
    };
  }

  async getTransactionStatus(providerTransactionId: string): Promise<GetTransactionStatusResult> {
    this.assertConfigured();
    return {
      status: PaymentStatus.PENDING,
      raw: { providerTransactionId },
    };
  }

  private assertConfigured() {
    if (!this.getConfig()) {
      throw new Error(
        "M-Pesa is not configured. Set MPESA_API_URL, MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY."
      );
    }
  }
}
