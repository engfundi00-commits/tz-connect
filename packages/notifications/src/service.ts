import { NotificationStatus, PrismaClient } from "@tz/database";
import { toInternational, logger } from "@tz/shared";
import { getSMSProvider } from "./sms/factory";
import { getWhatsAppProvider } from "./whatsapp/factory";

// =====================================================
// Notification Service
// =====================================================
//
// Sends SMS (primary) and WhatsApp (backup) for voucher
// delivery. Persists every message so delivery status can
// be tracked and reconciled. Guaranteed not to block the
// HTTP/webhook request (callers use it fire-and-forget).

export class NotificationService {
  constructor(private prisma: PrismaClient) {}

  async sendVoucherSMS(opts: {
    phoneNumber: string;
    code: string;
    packageName: string;
    durationHours: number;
    expiresAt: Date;
  }) {
    const message = this.buildVoucherMessage(opts);
    const recipient = toInternational(opts.phoneNumber);

    const sms = await this.prisma.sMSMessage.create({
      data: {
        recipient,
        message,
        provider: getSMSProvider().name,
        status: NotificationStatus.QUEUED,
      },
    });

    const provider = getSMSProvider();
    const result = await provider.sendSMS({ recipient, message });

    await this.prisma.sMSMessage.update({
      where: { id: sms.id },
      data: {
        status: result.status,
        providerMessageId: result.providerMessageId ?? null,
        error: result.error ?? null,
        deliveredAt: result.status === "DELIVERED" ? new Date() : null,
      },
    });

    return sms;
  }

  async sendVoucherWhatsApp(opts: {
    phoneNumber: string;
    code: string;
    packageName: string;
    durationHours: number;
    expiresAt: Date;
  }) {
    const message = this.buildVoucherMessage(opts);
    const recipient = toInternational(opts.phoneNumber);

    const wa = await this.prisma.whatsAppMessage.create({
      data: {
        recipient,
        message,
        provider: getWhatsAppProvider().name,
        status: NotificationStatus.QUEUED,
      },
    });

    const provider = getWhatsAppProvider();
    const result = await provider.sendWhatsApp({ recipient, message });

    await this.prisma.whatsAppMessage.update({
      where: { id: wa.id },
      data: {
        status: result.status,
        providerMessageId: result.providerMessageId ?? null,
        error: result.error ?? null,
        deliveredAt: result.status === "DELIVERED" ? new Date() : null,
      },
    });

    return wa;
  }

  async sendVoucher(opts: {
    phoneNumber: string;
    code: string;
    packageName: string;
    durationSeconds: number;
    expiresAt: Date;
  }) {
    const durationHours = Math.max(1, Math.round(opts.durationSeconds / 3600));

    // Fire SMS and WhatsApp independently; do not throw.
    const results = await Promise.allSettled([
      this.sendVoucherSMS({ ...opts, durationHours }),
      this.sendVoucherWhatsApp({ ...opts, durationHours }),
    ]);

    for (const r of results) {
      if (r.status === "rejected") {
        logger.error("Voucher notification failed", { error: r.reason });
      }
    }
  }

  private buildVoucherMessage(opts: {
    code: string;
    packageName: string;
    durationHours: number;
    expiresAt: Date;
  }): string {
    return [
      "TZ Connect Wi-Fi",
      `Package: ${opts.packageName}`,
      `Voucher: ${opts.code}`,
      `Valid for: ${opts.durationHours} hours`,
      `Expires: ${opts.expiresAt.toLocaleString()}`,
      "Dial/visit the login page to connect.",
    ].join("\n");
  }
}
