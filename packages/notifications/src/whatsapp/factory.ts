import type { WhatsAppProvider } from "./provider";
import { DisabledWhatsAppProvider } from "./providers/disabled";
import { HttpWhatsAppProvider } from "./providers/http";

// =====================================================
// WhatsApp Provider Factory
// =====================================================

export function getWhatsAppProvider(): WhatsAppProvider {
  const provider = process.env.WHATSAPP_PROVIDER || "none";
  switch (provider) {
    case "http":
      return new HttpWhatsAppProvider();
    case "none":
    default:
      return new DisabledWhatsAppProvider();
  }
}
