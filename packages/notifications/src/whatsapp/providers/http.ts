import { NotificationStatus } from "@tz/database";
import type { WhatsAppProvider, SendWhatsAppInput, SendWhatsAppResult } from "../provider";
import { logger } from "@tz/shared";

// =====================================================
// Generic HTTP WhatsApp Provider
// =====================================================
//
// Intended for a WhatsApp Business API provider
// (e.g. Twilio WhatsApp, Meta Cloud API, or a Tanzanian
// WhatsApp gateway). Configure via WHATSAPP_API_URL,
// WHATSAPP_API_TOKEN, WHATSAPP_NUMBER.
//
// The live API contract must be confirmed against the
// chosen provider before enabling.

export class HttpWhatsAppProvider implements WhatsAppProvider {
  readonly name = "http";

  private getConfig() {
    return process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN
      ? {
          apiUrl: process.env.WHATSAPP_API_URL,
          apiToken: process.env.WHATSAPP_API_TOKEN,
          fromNumber: process.env.WHATSAPP_NUMBER,
        }
      : null;
  }

  async sendWhatsApp(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
    const config = this.getConfig();
    if (!config) {
      logger.error("WhatsApp provider not configured");
      return { success: false, status: NotificationStatus.FAILED, error: "WhatsApp not configured" };
    }
    // TODO: Implement live call to config.apiUrl with config.apiToken
    logger.info("[whatsapp] not yet wired to live gateway", { recipient: input.recipient });
    return {
      success: false,
      status: NotificationStatus.FAILED,
      error: "WhatsApp live gateway not wired. See packages/notifications/src/whatsapp/providers/http.ts",
    };
  }
}
