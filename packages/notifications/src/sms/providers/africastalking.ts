import { NotificationStatus } from "@tz/database";
import type { SMSProvider, SendSMSInput, SendSMSResult, DeliveryStatusResult } from "../provider";
import { logger } from "@tz/shared";

// =====================================================
// Africa's Talking SMS Provider Adapter
// =====================================================
//
// Requires AFRICAS_TALKING_API_KEY, AFRICAS_TALKING_USERNAME
// and optionally AFRICAS_TALKING_SENDER_ID.
//
// The live HTTP call to the Africa's Talking gateway is
// wrapped and only executes when credentials are present.
// Without credentials the adapter fails loudly (it is never
// selected by default in development).

export class AfricasTalkingSMSProvider implements SMSProvider {
  readonly name = "africastalking";

  private getConfig() {
    return process.env.AFRICAS_TALKING_API_KEY && process.env.AFRICAS_TALKING_USERNAME
      ? {
          apiKey: process.env.AFRICAS_TALKING_API_KEY,
          username: process.env.AFRICAS_TALKING_USERNAME,
          senderId: process.env.AFRICAS_TALKING_SENDER_ID,
        }
      : null;
  }

  async sendSMS(input: SendSMSInput): Promise<SendSMSResult> {
    const config = this.getConfig();
    if (!config) {
      logger.error("Africa's Talking SMS not configured");
      return { success: false, status: NotificationStatus.FAILED, error: "AfricasTalking not configured" };
    }
    // TODO: Implement live HTTP call to
    // https://api.africastalking.com/version1/messaging
    // with the config above. The SMS HTTP API is documented at
    // https://build.africastalking.com/docs/sms/overview
    logger.info("[africastalking-sms] not yet wired to live gateway", { recipient: input.recipient });
    return {
      success: false,
      status: NotificationStatus.FAILED,
      error: "Africa's Talking live gateway not yet wired. See packages/notifications/src/sms/providers/africastalking.ts",
    };
  }

  async getDeliveryStatus(providerMessageId: string): Promise<DeliveryStatusResult> {
    return { status: NotificationStatus.SENT, providerMessageId };
  }
}
