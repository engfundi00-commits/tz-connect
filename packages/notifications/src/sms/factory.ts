import type { SMSProvider } from "./provider";
import { MockSMSProvider } from "./providers/mock";
import { AfricasTalkingSMSProvider } from "./providers/africastalking";

// =====================================================
// SMS Provider Factory
// =====================================================

export function getSMSProvider(): SMSProvider {
  const provider = process.env.SMS_PROVIDER || "mock";
  switch (provider) {
    case "africastalking":
      return new AfricasTalkingSMSProvider();
    case "twilio":
      // Twilio adapter can be added following the SMSProvider interface.
      throw new Error("Twilio SMS provider adapter not implemented yet");
    case "mock":
    default:
      return new MockSMSProvider();
  }
}
