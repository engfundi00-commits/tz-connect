import { NotificationStatus } from "@tz/database";

// =====================================================
// SMS Provider Abstraction
// =====================================================

export interface SendSMSInput {
  recipient: string; // E.164 phone number
  message: string;
}

export interface SendSMSResult {
  success: boolean;
  providerMessageId?: string;
  status: NotificationStatus;
  error?: string;
}

export interface DeliveryStatusResult {
  status: NotificationStatus;
  providerMessageId?: string;
}

export interface SMSProvider {
  readonly name: string;
  sendSMS(input: SendSMSInput): Promise<SendSMSResult>;
  getDeliveryStatus(providerMessageId: string): Promise<DeliveryStatusResult>;
}
