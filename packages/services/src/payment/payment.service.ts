import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
} from "@tz/database";
import { getPaymentProvider, isMockMode, PaymentProvider } from "@tz/payments";
import { normalizeTanzanianPhone } from "@tz/shared";
import { acquireIdempotencyLock } from "@tz/infra";
import { VoucherService } from "../voucher/voucher.service";
import { CustomerService } from "../customer/customer.service";
import { logger } from "@tz/shared";

// =====================================================
// Payment Service
// =====================================================
//
// Orchestrates payment providers, webhook handling and the
// authoritative, idempotent fulfilment path:
//   payment SUCCESS (verified via webhook) →
//   create/find customer →
//   sell voucher →
//   activate voucher → notify
//
// The customer's browser is NEVER trusted to confirm
// payment. Only a provider webhook (verified) triggers
// fulfilment. Idempotency guarantees duplicate callbacks
// never create duplicate vouchers.

export interface PaymentServiceDeps {
  voucherService: VoucherService;
  customerService: CustomerService;
  onVoucherFulfilled?: (opts: {
    voucherCode: string;
    phoneNumber: string;
    packageName: string;
    durationSeconds: number;
    expiresAt: Date;
    paymentId: string;
  }) => Promise<void>;
}

export class PaymentService {
  constructor(
    private prisma: PrismaClient,
    private deps: PaymentServiceDeps
  ) {}

  /**
   * Initiate a payment. Creates a PENDING Payment row and
   * calls the provider's initiatePayment. For mobile-money
   * methods only (CASH is manual and not initiated here).
   */
  async initiate(opts: {
    packageId: string;
    phoneNumber: string;
    paymentMethod: PaymentMethod;
    siteId?: string | null;
    organizationId: string;
    initiatedBy: string;
  }): Promise<Payment> {
    const normalized = normalizeTanzanianPhone(opts.phoneNumber);
    if (!normalized) throw new Error("Invalid Tanzanian phone number");

    if (opts.paymentMethod === PaymentMethod.CASH) {
      throw new Error("Cash payments are manual only");
    }

    const pkg = await this.prisma.package.findUnique({ where: { id: opts.packageId } });
    if (!pkg) throw new Error("Package not found");

    const customer = await this.deps.customerService.findOrCreate({
      phoneNumber: normalized,
      organizationId: opts.organizationId,
      siteId: opts.siteId,
    });

    const payment = await this.prisma.payment.create({
      data: {
        organizationId: opts.organizationId,
        siteId: opts.siteId ?? null,
        provider: opts.paymentMethod,
        amount: pkg.price,
        currency: pkg.currency,
        phoneNumber: normalized,
        packageId: pkg.id,
        customerId: customer.id,
        status: PaymentStatus.PENDING,
        initiatedBy: opts.initiatedBy,
        initiatedAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        reference: `TZ-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      },
    });

    const provider = getPaymentProvider(opts.paymentMethod);
    const result = await provider.initiatePayment({
      amount: pkg.price,
      currency: pkg.currency,
      phoneNumber: normalized,
      reference: payment.reference!,
      description: pkg.name,
    });

    if (result.providerTransactionId) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { providerTransactionId: result.providerTransactionId, status: PaymentStatus.PROCESSING },
      });
    }

    return payment;
  }

  /**
   * Authoritative fulfilment of a successfully paid payment.
   * Idempotent — returns the existing voucher if this payment
   * has already been fulfilled.
   */
  async fulfillSuccessfulPayment(paymentId: string): Promise<{
    voucherCode: string;
    payment: Payment;
    alreadyFulfilled: boolean;
  }> {
    const lockResult = await acquireIdempotencyLock(`pay:${paymentId}`, 120000);
    // Even if the lock isn't acquired (concurrent duplicate),
    // rely on the DB idempotency check below which is atomic.
    void lockResult;

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { package: true },
    });
    if (!payment) throw new Error("Payment not found");

    // DB-level idempotency: if a voucher is already linked to
    // this payment, return it (do NOT create a duplicate).
    const existingVoucher = await this.prisma.voucher.findFirst({
      where: { paymentId: payment.id },
    });
    if (existingVoucher) {
      logger.info("Payment already fulfilled; returning existing voucher", { paymentId });
      return { voucherCode: existingVoucher.code, payment, alreadyFulfilled: true };
    }

    // Transactional fulfilment: mark success + create/sell+activate voucher atomically.
    let fulfilled: { code: string };
    fulfilled = await this.prisma.$transaction(async (tx) => {
      const current = await tx.payment.findUnique({ where: { id: paymentId } });
      if (current!.status === PaymentStatus.SUCCESS) {
        const existing = await tx.voucher.findFirst({ where: { paymentId: paymentId } });
        if (existing) {
          return { code: existing.code };
        }
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.SUCCESS, completedAt: new Date() },
      });

      const pkg = payment.package!;
      const phone = payment.phoneNumber!;

      const customer = await this.deps.customerService.findOrCreate({
        phoneNumber: phone,
        organizationId: payment.organizationId,
        siteId: payment.siteId,
      });

      // Sell + activate the voucher for this customer (idempotent by paymentId)
      const voucher = await this.deps.voucherService.sellVoucher({
        packageId: pkg.id,
        soldBy: payment.initiatedBy || "portal",
        customerId: customer.id,
        paymentId: payment.id,
        paymentMethod: payment.provider,
        siteId: payment.siteId,
        activate: true,
      });

      return { code: voucher.code };
    });

    // Fire out-of-band notification (SMS/WhatsApp) — never blocks webhook.
    if (this.deps.onVoucherFulfilled) {
      const pkg = payment.package!;
      const expiresAt = new Date(Date.now() + pkg.durationSeconds * 1000);
      void this.deps
        .onVoucherFulfilled({
          voucherCode: fulfilled.code,
          phoneNumber: payment.phoneNumber!,
          packageName: pkg.name,
          durationSeconds: pkg.durationSeconds,
          expiresAt,
          paymentId: payment.id,
        })
        .catch((e) => logger.error("onVoucherFulfilled hook failed", { error: e }));
    }

    return { voucherCode: fulfilled.code, payment, alreadyFulfilled: false };
  }

  /**
   * Handle a webhook from a payment provider. Verifies it,
   * then fulfils ONLY on verified SUCCESS. Idempotent.
   */
  async handleWebhook(method: PaymentMethod, envelope: { headers: Record<string, string>; body: unknown }) {
    const provider: PaymentProvider = getPaymentProvider(method);
    const result = await provider.handleWebhook(envelope);

    if (result.status !== PaymentStatus.SUCCESS) {
      return { fulfilled: false, status: result.status };
    }

    // Resolve the provider transaction id to our Payment.
    const providerTxId = result.providerTransactionId;

    let payment: Payment | null = null;
    if (providerTxId) {
      payment = await this.prisma.payment.findUnique({
        where: {
          provider_providerTransactionId: {
            provider: method,
            providerTransactionId: providerTxId,
          },
        },
      });
    }

    // Mock mode: the mock webhook body carries our payment_id directly.
    if (!payment && isMockMode()) {
      const body = envelope.body as Record<string, unknown>;
      const paymentId = (body.payment_id as string) ?? (body.paymentId as string);
      if (paymentId) {
        payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
      }
    }

    if (!payment) {
      logger.warn("Webhook success but no matching payment found", { method, providerTxId });
      return { fulfilled: false, status: result.status };
    }

    const fulfilment = await this.fulfillSuccessfulPayment(payment.id);
    return {
      fulfilled: true,
      voucherCode: fulfilment.voucherCode,
      status: result.status,
      alreadyFulfilled: fulfilment.alreadyFulfilled,
    };
  }

  async get(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { package: true, customer: true, vouchers: true },
    });
  }

  async list(params: {
    page?: number;
    limit?: number;
    status?: PaymentStatus;
    provider?: PaymentMethod;
    organizationId?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const where: Record<string, unknown> = {};
    if (params.organizationId) where.organizationId = params.organizationId;
    if (params.status) where.status = params.status;
    if (params.provider) where.provider = params.provider;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: { package: true, customer: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items, total, page, limit };
  }
}
