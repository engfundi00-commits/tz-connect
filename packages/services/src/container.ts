import { PrismaClient } from "@tz/database";
import {
  NotificationService,
} from "@tz/notifications";
import {
  buildController,
  isMockMode as isMikrotikMock,
} from "@tz/mikrotik";
import { generateVoucherCode as generateCode } from "@tz/shared";
import { VoucherService } from "./voucher/voucher.service";
import { CustomerService } from "./customer/customer.service";
import { PackageService } from "./package/package.service";
import { PaymentService } from "./payment/payment.service";
import { logger } from "@tz/shared";

// =====================================================
// Service Container
// =====================================================
//
// Wires the reusable application services together with
// their cross-cutting dependencies (database, MikroTik,
// notifications). The web app and background workers both
// build from this container, so voucher lifecycle logic
// lives in exactly one place.

export interface Services {
  prisma: PrismaClient;
  voucherService: VoucherService;
  customerService: CustomerService;
  packageService: PackageService;
  paymentService: PaymentService;
  notificationService: NotificationService;
}

let cached: Services | null = null;

export function createServices(input?: { prisma?: PrismaClient }): Services {
  const prisma = input?.prisma ?? new PrismaClient();

  const voucherService = new VoucherService(prisma, {
    generateVoucherCode: (existing) => generateCode(existing),
    // Push the created hotspot user to the router on activation.
    async validateVoucherOnRouter(voucher) {
      await provisionVoucherOnRouter(prisma, voucher);
    },
    async onVoucherExpired(voucher) {
      await terminateVoucherOnRouter(prisma, voucher);
    },
  });

  const customerService = new CustomerService(prisma);
  const packageService = new PackageService(prisma);
  const notificationService = new NotificationService(prisma);

  const paymentService = new PaymentService(prisma, {
    voucherService,
    customerService,
    async onVoucherFulfilled(opts) {
      await notificationService.sendVoucher({
        phoneNumber: opts.phoneNumber,
        code: opts.voucherCode,
        packageName: opts.packageName,
        durationSeconds: opts.durationSeconds,
        expiresAt: opts.expiresAt,
      });
      logger.info("Voucher notification dispatched", { paymentId: opts.paymentId });
    },
  });

  return {
    prisma,
    voucherService,
    customerService,
    packageService,
    paymentService,
    notificationService,
  };
}

export function getServices(): Services {
  if (!cached) cached = createServices();
  return cached;
}

// ------------------------------------------------------
// Router provisioning hooks
// ------------------------------------------------------

async function provisionVoucherOnRouter(
  prisma: PrismaClient,
  voucher: { id: string; mikrotikUsername: string; password: string | null; mikrotikProfile: string | null; timeLimit: number | null; dataLimit: bigint | null; deviceLimit: number | null; code: string }
) {
  // Only provision when in a mode that talks to a router.
  if (isMikrotikMock() && (process.env.MIKROTIK_MODE || "mock") === "mock") {
    logger.info("[mock-router] activating voucher (no real provisioning)", { voucher: voucher.code });
    return;
  }

  const router = await prisma.router.findFirst({
    where: { status: { in: ["ONLINE", "UNKNOWN"] } },
    orderBy: { lastSeenAt: "desc" },
  });
  if (!router) {
    logger.warn("No eligible router found to provision voucher", { voucher: voucher.code });
    return;
  }

  try {
    const controller = buildController(router as any);
    const limitedUptime = voucher.timeLimit ? secondsToDuration(voucher.timeLimit) : undefined;
    await controller.createHotspotUser({
      name: voucher.mikrotikUsername,
      password: voucher.password ?? voucher.code.slice(0, 12),
      profile: voucher.mikrotikProfile ?? "default",
      limitBytesTotal: voucher.dataLimit ? BigInt(voucher.dataLimit) : undefined,
      limitUptime: limitedUptime,
      comment: `voucher ${voucher.code}`,
    });
  } catch (e) {
    logger.error("Failed to provision voucher on router", { error: e });
  }
}

async function terminateVoucherOnRouter(
  prisma: PrismaClient,
  voucher: { mikrotikUsername: string; code: string }
) {
  if ((process.env.MIKROTIK_MODE || "mock") === "mock") {
    logger.info("[mock-router] terminating voucher (no real action)", { voucher: voucher.code });
    return;
  }
  const router = await prisma.router.findFirst({
    where: { status: { in: ["ONLINE", "UNKNOWN"] } },
    orderBy: { lastSeenAt: "desc" },
  });
  if (!router) return;
  try {
    const controller = buildController(router as any);
    await controller.disableHotspotUser(voucher.mikrotikUsername);
    await controller.disconnectUser(voucher.mikrotikUsername);
  } catch (e) {
    logger.error("Failed to terminate voucher on router", { error: e });
  }
}

function secondsToDuration(totalSeconds: number): string {
  const weeks = Math.floor(totalSeconds / (7 * 86400));
  const days = Math.floor((totalSeconds % (7 * 86400)) / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  let out = "";
  if (weeks) out += `${weeks}w`;
  if (days) out += `${days}d`;
  if (hours || out) out += `${String(hours).padStart(2, "0")}:`;
  out += `${String(minutes).padStart(2, "0")}:`;
  out += `${String(seconds).padStart(2, "0")}`;
  return out;
}
