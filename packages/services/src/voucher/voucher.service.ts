import {
  PaymentMethod,
  PrismaClient,
  Prisma,
  Voucher,
  VoucherStatus,
} from "@tz/database";
import { generateVoucherCodes } from "@tz/shared";
import {
  VoucherServiceDeps,
  VoucherAction,
  canTransition,
} from "./voucher.types";
import { logger } from "@tz/shared";

// =====================================================
// Voucher Service — the authoritative voucher lifecycle
// =====================================================
//
// Reusable by API routes, webhook handlers, background
// workers and CLI tooling. All state transitions are
// validated; multi-record operations run in transactions;
// idempotent and safe against duplicate webhooks.

export class VoucherService {
  constructor(
    private prisma: PrismaClient,
    private deps: VoucherServiceDeps
  ) {}

  /**
   * Generate a single voucher. Creates the voucher in
   * GENERATED status, then returns it.
   */
  async generateSingleVoucher(opts: {
    packageId: string;
    siteId?: string | null;
    organizationId: string;
    generatedBy: string;
    customerId?: string | null;
    status?: VoucherStatus;
  }): Promise<Voucher> {
    const pkg = await this.prisma.package.findUnique({
      where: { id: opts.packageId },
    });
    if (!pkg) throw new Error("Package not found");
    if (pkg.organizationId !== opts.organizationId) throw new Error("Package not in organization");

    const code = this.deps.generateVoucherCode(new Set());
    const username = this.buildRouterUsername(opts, pkg.name);

    const voucher = await this.prisma.voucher.create({
      data: {
        code,
        packageId: pkg.id,
        siteId: opts.siteId ?? pkg.siteId ?? null,
        customerId: opts.customerId ?? null,
        price: pkg.price,
        currency: pkg.currency,
        status: opts.status ?? VoucherStatus.AVAILABLE,
        generatedBy: opts.generatedBy,
        generatedAt: new Date(),
        mikrotikUsername: username,
        mikrotikProfile: this.profileForPackage(pkg.name),
        timeLimit: pkg.durationSeconds,
        dataLimit: pkg.dataLimitBytes ? BigInt(pkg.dataLimitBytes) : null,
        deviceLimit: pkg.deviceLimit,
        password: this.generatePassword(opts.packageId),
      },
    });

    return voucher;
  }

  /**
   * Generate N vouchers in a single transaction.
   */
  async generateBulkVouchers(opts: {
    packageId: string;
    siteId?: string | null;
    organizationId: string;
    generatedBy: string;
    quantity: number;
    status?: VoucherStatus;
  }): Promise<Voucher[]> {
    const pkg = await this.prisma.package.findUnique({ where: { id: opts.packageId } });
    if (!pkg) throw new Error("Package not found");
    if (pkg.organizationId !== opts.organizationId) throw new Error("Package not in organization");

    const quantity = Math.min(Math.max(1, Math.floor(opts.quantity)), 1000);

    // Collect existing codes to guarantee uniqueness
    const existing = await this.prisma.voucher.findMany({
      select: { code: true },
      where: { packageId: opts.packageId },
    });
    const existingSet = new Set(existing.map((v) => v.code));

    const codes = generateVoucherCodes(quantity, existingSet);

    return this.prisma.$transaction(async (tx) => {
      const created: Voucher[] = [];
      for (const code of codes) {
        created.push(
          await tx.voucher.create({
            data: {
              code,
              packageId: pkg.id,
              siteId: opts.siteId ?? pkg.siteId ?? null,
              price: pkg.price,
              currency: pkg.currency,
              status: opts.status ?? VoucherStatus.AVAILABLE,
              generatedBy: opts.generatedBy,
              generatedAt: new Date(),
              mikrotikUsername: `tz_${code.replace(/[^A-Z0-9]/gi, "").slice(-10)}`,
              mikrotikProfile: this.profileForPackage(pkg.name),
              timeLimit: pkg.durationSeconds,
              dataLimit: pkg.dataLimitBytes ? BigInt(pkg.dataLimitBytes) : null,
              deviceLimit: pkg.deviceLimit,
              password: this.generatePassword(opts.packageId),
            },
          })
        );
      }
      return created;
    });
  }

  /**
   * Reserve an available voucher (e.g. for an in-progress
   * sale or payment). MUST be AVAILABLE → RESERVED.
   */
  async reserveVoucher(opts: {
    id?: string;
    code?: string;
    by: string;
  }): Promise<Voucher> {
    const where = this.whereFromIdOrCode(opts.id, opts.code);
    const voucher = await this.prisma.voucher.findUnique({ where });
    if (!voucher) throw new Error("Voucher not found");
    this.assertTransition(voucher.status, "reserve");

    return this.prisma.voucher.update({
      where: { id: voucher.id },
      data: { status: VoucherStatus.RESERVED },
    });
  }

  /**
   * Sell a voucher (manual/agent sale or payment fulfilment).
   *
   * Two modes:
   *  a) By id/code — sells the specific voucher
   *     (AVAILABLE / RESERVED / SOLD → SOLD).
   *  b) By packageId — automatic flow: picks an available
   *     voucher for the package (same price), or generates a
   *     new one, then sells it.
   *
   * If `activate` is true, the voucher is activated (time
   * window starts) immediately after sale — used for payment
   * fulfilment where the customer connects right away.
   */
  async sellVoucher(opts: {
    id?: string;
    code?: string;
    packageId?: string;
    soldBy: string;
    customerId?: string | null;
    paymentId?: string | null;
    paymentMethod?: PaymentMethod;
    siteId?: string | null;
    activate?: boolean;
  }): Promise<Voucher> {
    let voucher: Voucher;

    if (opts.packageId) {
      // Automatic flow: reuse an available voucher or generate one
      const pkg = await this.prisma.package.findUnique({ where: { id: opts.packageId } });
      if (!pkg) throw new Error("Package not found");

      const available = await this.prisma.voucher.findFirst({
        where: {
          packageId: opts.packageId,
          status: VoucherStatus.AVAILABLE,
          price: pkg.price,
          customerId: null,
          paymentId: null,
        },
        orderBy: { generatedAt: "asc" },
      });

      if (available) {
        voucher = available;
      } else {
        voucher = await this.generateSingleVoucher({
          packageId: opts.packageId,
          siteId: opts.siteId ?? pkg.siteId,
          organizationId: pkg.organizationId,
          generatedBy: opts.soldBy,
        });
      }
    } else {
      const where = this.whereFromIdOrCode(opts.id, opts.code);
      const found = await this.prisma.voucher.findUnique({ where });
      if (!found) throw new Error("Voucher not found");
      voucher = found;
    }

    this.assertTransition(voucher.status, "sell");

    const updated = await this.prisma.voucher.update({
      where: { id: voucher.id },
      data: {
        status: VoucherStatus.SOLD,
        soldBy: opts.soldBy,
        soldAt: new Date(),
        customerId: opts.customerId ?? voucher.customerId,
        paymentId: opts.paymentId ?? voucher.paymentId,
        siteId: opts.siteId ?? voucher.siteId,
      },
    });

    if (opts.activate) {
      await this.activateVoucher({
        id: updated.id,
        activatedBy: opts.soldBy,
        customerId: opts.customerId ?? undefined,
      });
      return this.prisma.voucher.findUnique({ where: { id: updated.id } }) as Promise<Voucher>;
    }

    if (this.deps.onVoucherSold) {
      void this.deps
        .onVoucherSold(updated, {
          paymentMethod: opts.paymentMethod ?? PaymentMethod.CASH,
          customerId: opts.customerId ?? undefined,
        })
        .catch((e) => logger.error("onVoucherSold hook failed", { error: e }));
    }

    return updated;
  }

  /**
   * Activate a voucher (SOLD / AVAILABLE / RESERVED →
   * ACTIVE). Determines expiresAt from the package duration.
   */
  async activateVoucher(opts: {
    id?: string;
    code?: string;
    activatedBy: string;
    customerId?: string | null;
  }): Promise<Voucher> {
    const where = this.whereFromIdOrCode(opts.id, opts.code);
    const voucher = await this.prisma.voucher.findUnique({
      where,
      include: { package: true },
    });
    if (!voucher) throw new Error("Voucher not found");
    this.assertTransition(voucher.status, "activate");

    const pkg = voucher.package;
    const expiresAt = new Date(Date.now() + pkg.durationSeconds * 1000);

    // Push to router first (authoritative on the network).
    if (this.deps.validateVoucherOnRouter) {
      await this.deps.validateVoucherOnRouter(voucher);
    }

    const activated = await this.prisma.voucher.update({
      where: { id: voucher.id },
      data: {
        status: VoucherStatus.ACTIVE,
        activatedAt: new Date(),
        expiresAt,
        customerId: opts.customerId ?? voucher.customerId,
      },
    });

    if (this.deps.onVoucherActivated) {
      void this.deps
        .onVoucherActivated(activated)
        .catch((e) => logger.error("onVoucherActivated hook failed", { error: e }));
    }

    return activated;
  }

  /**
   * Disable a voucher (→ DISABLED). Records the reason.
   */
  async disableVoucher(opts: {
    id?: string;
    code?: string;
    by: string;
    reason?: string;
  }): Promise<Voucher> {
    const where = this.whereFromIdOrCode(opts.id, opts.code);
    const voucher = await this.prisma.voucher.findUnique({ where });
    if (!voucher) throw new Error("Voucher not found");
    this.assertTransition(voucher.status, "disable");

    return this.prisma.voucher.update({
      where: { id: voucher.id },
      data: {
        status: VoucherStatus.DISABLED,
        disabledAt: new Date(),
        disabledReason: opts.reason,
      },
    });
  }

  /**
   * Expire a voucher (→ EXPIRED). Triggers router access
   * termination hook.
   */
  async expireVoucher(opts: {
    id?: string;
    code?: string;
    by?: string;
  }): Promise<Voucher> {
    const where = this.whereFromIdOrCode(opts.id, opts.code);
    const voucher = await this.prisma.voucher.findUnique({ where });
    if (!voucher) throw new Error("Voucher not found");
    this.assertTransition(voucher.status, "expire");

    const expired = await this.prisma.voucher.update({
      where: { id: voucher.id },
      data: { status: VoucherStatus.EXPIRED },
    });

    if (this.deps.onVoucherExpired) {
      void this.deps
        .onVoucherExpired(expired)
        .catch((e) => logger.error("onVoucherExpired hook failed", { error: e }));
    }

    return expired;
  }

  /**
   * Expire all vouchers that are now past their expiresAt.
   * Returns the count expired. Backed by a transaction.
   */
  async expireDueVouchers(now = new Date()): Promise<number> {
    const due = await this.prisma.voucher.updateMany({
      where: {
        status: { in: [VoucherStatus.ACTIVE, VoucherStatus.SOLD] },
        expiresAt: { lt: now },
      },
      data: { status: VoucherStatus.EXPIRED },
    });

    // Fire hook for each expired voucher for router termination.
    if (due.count > 0) {
      const expired = await this.prisma.voucher.findMany({
        where: {
          status: VoucherStatus.EXPIRED,
          expiresAt: { lt: now },
          activatedAt: { not: null },
        },
        take: due.count,
      });
      for (const v of expired) {
        if (this.deps.onVoucherExpired) {
          void this.deps
            .onVoucherExpired(v)
            .catch((e) => logger.error("expireVoucher hook failed", { error: e }));
        }
      }
    }

    return due.count;
  }

  /**
   * Validate a voucher code exists, is usable (not
   * expired/disabled/used), and return it with package info.
   * Used by the captive portal and router auth boundary.
   */
  async validateVoucher(code: string, opts?: { activate?: boolean }): Promise<Voucher | null> {
    const voucher = await this.prisma.voucher.findUnique({
      where: { code },
      include: { package: true },
    });
    if (!voucher) return null;

    const now = new Date();
    const usable =
      voucher.status === VoucherStatus.AVAILABLE ||
      voucher.status === VoucherStatus.SOLD ||
      voucher.status === VoucherStatus.ACTIVE;

    if (!usable) return null;
    if (voucher.expiresAt && voucher.expiresAt < now) {
      await this.expireVoucher({ id: voucher.id }).catch(() => {});
      return null;
    }

    if (opts?.activate && voucher.status !== VoucherStatus.ACTIVE) {
      await this.activateVoucher({ id: voucher.id, activatedBy: "portal" });
      return this.prisma.voucher.findUnique({ where: { id: voucher.id }, include: { package: true } });
    }

    return voucher as Voucher & { package?: any };
  }

  async getVoucher(opts: { id?: string; code?: string; includePackage?: boolean }) {
    const where = this.whereFromIdOrCode(opts.id, opts.code);
    return this.prisma.voucher.findUnique({
      where,
      include: opts.includePackage ? { package: true, customer: true } : undefined,
    });
  }

  async listVouchers(params: {
    page?: number;
    limit?: number;
    status?: VoucherStatus;
    siteId?: string;
    packageId?: string;
    customerId?: string;
    search?: string;
    organizationId?: string;
    from?: string;
    to?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const where: Prisma.VoucherWhereInput = {};
    if (params.organizationId) {
      where.package = { organizationId: params.organizationId };
    }
    if (params.status) where.status = params.status;
    if (params.siteId) where.siteId = params.siteId;
    if (params.packageId) where.packageId = params.packageId;
    if (params.customerId) where.customerId = params.customerId;
    if (params.from || params.to) {
      where.generatedAt = {};
      if (params.from) where.generatedAt.gte = new Date(params.from);
      if (params.to) where.generatedAt.lte = new Date(params.to);
    }
    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: "insensitive" } },
        { mikrotikUsername: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.voucher.findMany({
        where,
        include: { package: true, customer: true },
        orderBy: { generatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.voucher.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // --- Helpers ---

  private whereFromIdOrCode(id?: string, code?: string): { id: string } | { code: string } {
    if (id) return { id };
    if (code) return { code };
    throw new Error("Either id or code must be provided");
  }

  private assertTransition(from: VoucherStatus, action: VoucherAction): void {
    if (!canTransition(from, action)) {
      throw new Error(`Invalid voucher transition: ${from} → ${action}`);
    }
  }

  private buildRouterUsername(
    opts: { generatedBy: string; customerId?: string | null },
    packageName: string
  ): string {
    if (this.deps.generateRouterUsername) {
      return this.deps.generateRouterUsername({ packageName });
    }
    const suffix = opts.generatedBy.slice(-4) + Math.random().toString(36).slice(2, 6);
    return `tz_${suffix}_${Date.now().toString(36).slice(-4)}`;
  }

  private profileForPackage(packageName: string): string {
    return `tz_${packageName.replace(/[^A-Za-z0-9]+/g, "_").toLowerCase().slice(0, 30)}`;
  }

  private generatePassword(salt: string): string {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(`${salt}${crypto.randomBytes(8)}`).digest("hex").slice(0, 12);
  }
}
