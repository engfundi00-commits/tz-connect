import { NotificationStatus } from "@tz/database";
import type { SMSProvider, SendSMSInput, SendSMSResult, DeliveryStatusResult } from "../provider";
import { logger } from "@tz/shared";

// =====================================================
// Mock SMS Provider
// =====================================================
//
// DEVELOPMENT / TESTING ONLY. Logs the message and marks
// it DELIVERED without sending anything. Never enabled in
// production (selected when SMS_PROVIDER=mock).

export class MockSMSProvider implements SMSProvider {
  readonly name = "mock";

  async sendSMS(input: SendSMSInput): Promise<SendSMSResult> {
    logger.info("[mock-sms] would send", { recipient: input.recipient, message: input.message });
    return {
      success: true,
      providerMessageId: `mock-sms-${Date.now()}`,
      status: NotificationStatus.DELIVERED,
    };
  }

  async getDeliveryStatus(providerMessageId: string): Promise<DeliveryStatusResult> {
    return { status: NotificationStatus.DELIVERED, providerMessageId };
  }
}
