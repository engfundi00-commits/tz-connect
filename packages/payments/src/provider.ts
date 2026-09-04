import type { PaymentMethod, PaymentStatus } from "@tz/database";

// =====================================================
// Payment Provider Abstraction
// =====================================================
//
// All payment providers implement this interface.
// Adapters for M-Pesa, Airtel Money, Mixx by Yas and
// HaloPesa are provided. Where API credentials or
// official documentation are not available, adapters
// expose clear configuration boundaries and must NOT
// fabricate successful transactions.

export interface InitiatePaymentInput {
  amount: number;
  currency: string;
  phoneNumber: string;
  reference: string;
  description?: string;
  callbackUrl?: string;
}

export interface InitiatePaymentResult {
  success: boolean;
  providerTransactionId?: string;
  status: PaymentStatus;
  raw?: unknown;
}

export interface VerifyPaymentInput {
  providerTransactionId: string;
  amount?: number;
  phoneNumber?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  status: PaymentStatus;
  providerTransactionId?: string;
  raw?: unknown;
}

export interface WebhookEnvelope {
  headers: Record<string, string>;
  body: unknown;
}

export interface WebhookResult {
  handled: boolean;
  status: PaymentStatus;
  providerTransactionId?: string;
  raw?: unknown;
}

export interface GetTransactionStatusResult {
  status: PaymentStatus;
  raw?: unknown;
}

export interface PaymentProvider {
  readonly name: PaymentMethod;
  initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  handleWebhook(envelope: WebhookEnvelope): Promise<WebhookResult>;
  getTransactionStatus(providerTransactionId: string): Promise<GetTransactionStatusResult>;
}
