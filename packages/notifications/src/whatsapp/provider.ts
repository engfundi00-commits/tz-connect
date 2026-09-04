import { NotificationStatus } from "@tz/database";

// =====================================================
// WhatsApp Provider Abstraction
// =====================================================
//
// WhatsApp is a backup channel to SMS for voucher delivery.

export interface SendWhatsAppInput {
  recipient: string; // E.164 phone number
  message: string;
  templateName?: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  providerMessageId?: string;
  status: NotificationStatus;
  error?: string;
}

export interface WhatsAppProvider {
  readonly name: string;
  sendWhatsApp(input: SendWhatsAppInput): Promise<SendWhatsAppResult>;
}
