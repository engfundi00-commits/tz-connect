import { NotificationStatus } from "@tz/database";
import type { WhatsAppProvider, SendWhatsAppInput, SendWhatsAppResult } from "../provider";
import { logger } from "@tz/shared";

// =====================================================
// No-op / Disabled WhatsApp Provider
// =====================================================
//
// Default provider when WhatsApp is not configured.
// Returns CANCELLED without sending (does not fabricate
// a delivery).

export class DisabledWhatsAppProvider implements WhatsAppProvider {
  readonly name = "none";

  async sendWhatsApp(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
    logger.info("[whatsapp] disabled; skipping send", { recipient: input.recipient });
    return { success: false, status: NotificationStatus.CANCELLED, error: "WhatsApp not configured" };
  }
}
