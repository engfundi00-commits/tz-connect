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
// MOCK PAYMENT PROVIDER
// =====================================================
//
// DEVELOPMENT / TESTING ONLY.
// This provider lets the full payment → voucher flow run
// locally without real mobile-money credentials, and powers
// automated tests.
//
// It MUST NOT be enabled in production. The factory only
// returns this provider when the payment provider is
// explicitly set to "MockPesa" or when PAYMENT_MODE=mock.
//
// The webhook handler verifies a shared secret so the flow
// is exercised end-to-end without external dependencies.

export class MockPaymentProvider implements PaymentProvider {
  readonly name = PaymentMethod.MPESA; // mimics the primary mobile-money method
  readonly isMock = true;

  private getSecret(): string {
    return process.env.PAYMENT_WEBHOOK_SECRET || "tokomock-secret";
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    // Simulate a provider transaction id
    return {
      success: true,
      providerTransactionId: `MOCK-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      status: PaymentStatus.PENDING,
      raw: { mock: true, amount: input.amount },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    return {
      success: true,
      status: PaymentStatus.SUCCESS,
      providerTransactionId: input.providerTransactionId,
      raw: { mock: true },
    };
  }

  async handleWebhook(envelope: WebhookEnvelope): Promise<WebhookResult> {
    const body = envelope.body as Record<string, unknown>;
    const signature = envelope.headers["x-tz-signature"];

    const expected = this.sign(
      `${body.status ?? ""}${body.transaction_id ?? ""}${body.amount ?? ""}`
    );
    return {
      handled: true,
      status: signature === expected ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
      providerTransactionId: (body.transaction_id as string) ?? undefined,
      raw: body,
    };
  }

  async getTransactionStatus(providerTransactionId: string): Promise<GetTransactionStatusResult> {
    return { status: PaymentStatus.SUCCESS, raw: { providerTransactionId, mock: true } };
  }

  private sign(payload: string): string {
    const crypto = require("crypto");
    return crypto.createHmac("sha256", this.getSecret()).update(payload).digest("hex");
  }
}
