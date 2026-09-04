import { PrismaClient, NetworkDeviceStatus, Router, alertType, AlertSeverity } from "@tz/database";
import { logger } from "@tz/shared";
import { buildController, RouterHealth } from "@tz/mikrotik";

// =====================================================
// Network Monitoring Service
// =====================================================
//
// Polls routers and updates device status, records
// bandwidth samples, and generates NetworkAlert records
// based on thresholds. Designed to run as a background
// worker (Redis/BullMQ) so it never blocks web requests.
//
// In mock mode, router status reflects the mock controller
// health; alerts are still generated deterministically from
// threshold rules so the flow is fully testable.

export interface MonitoringServiceOptions {
  prisma: PrismaClient;
  enabled?: boolean;
  scanIntervalMs?: number;
}

export class MonitoringService {
  private prisma: PrismaClient;
  private enabled: boolean;
  private timer: NodeJS.Timeout | null = null;

  constructor(opts: MonitoringServiceOptions) {
    this.prisma = opts.prisma;
    this.enabled = opts.enabled ?? true;
  }

  start() {
    if (!this.enabled) return;
    const interval = Number(process.env.MONITORING_SCAN_INTERVAL_MS || 30000);
    this.timer = setInterval(() => {
      void this.scanAll().catch((e) => logger.error("monitoring scan failed", { error: e }));
    }, interval);
    // initial scan
    void this.scanAll().catch((e) => logger.error("monitoring scan failed", { error: e }));
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async scanAll() {
    const routers = await this.prisma.router.findMany({ where: { status: { not: undefined } } });
    for (const router of routers) {
      await this.scanRouter(router);
    }
  }

  async scanRouter(router: Router) {
    const controller = buildController(router);
    let status: NetworkDeviceStatus = NetworkDeviceStatus.UNKNOWN;
    let health: RouterHealth | null = null;
    let error: string | undefined;

    try {
      const result = await controller.getStatus();
      if (result.online) {
        status = NetworkDeviceStatus.ONLINE;
        health = result.health ?? null;
      } else {
        status = NetworkDeviceStatus.OFFLINE;
        error = result.error;
      }
    } catch (e) {
      status = NetworkDeviceStatus.OFFLINE;
      error = (e as Error).message;
    }

    await this.prisma.router.update({
      where: { id: router.id },
      data: {
        status,
        cpuUsage: health?.cpuLoad ?? null,
        memoryUsage: health ? (health.freeMemory / health.totalMemory) * 100 : null,
        uptimeSeconds: health?.uptimeSeconds ? BigInt(health.uptimeSeconds) : null,
        lastSeenAt: status === NetworkDeviceStatus.ONLINE ? new Date() : null,
        lastCheckedAt: new Date(),
      },
    });

    // Alerts
    await this.saveAlertFromHealth(router, status, health, error);
  }

  private async saveAlertFromHealth(
    router: { id: string; siteId: string },
    status: NetworkDeviceStatus,
    health: RouterHealth | null,
    error?: string
  ) {
    if (status === NetworkDeviceStatus.OFFLINE) {
      await this.upsertOpenAlert(router.siteId, router.id, "ROUTER_OFFLINE", "CRITICAL", "Router is offline", error);
      return;
    }
    if (status === NetworkDeviceStatus.ONLINE) {
      await this.resolveOpenAlert(router.id, "ROUTER_OFFLINE");
    }
    if (health) {
      const cpuThreshold = Number(process.env.ALERT_CPU_THRESHOLD_PERCENT || 90);
      if (health.cpuLoad >= cpuThreshold) {
        await this.upsertOpenAlert(router.siteId, router.id, "HIGH_CPU", "WARNING", `High CPU: ${health.cpuLoad}%`, undefined);
      } else {
        await this.resolveOpenAlert(router.id, "HIGH_CPU");
      }
    }
    if (error) {
      logger.warn("router scan error", { routerId: router.id, error });
    }
  }

  private async upsertOpenAlert(siteId: string, routerId: string, type: alertType, severity: AlertSeverity, title: string, message?: string) {
    const existing = await this.prisma.networkAlert.findFirst({
      where: { routerId, type, status: "OPEN" },
    });
    if (existing) return;
    await this.prisma.networkAlert.create({
      data: {
        siteId,
        routerId,
        type,
        severity,
        status: "OPEN",
        title,
        message,
      },
    });
  }

  private async resolveOpenAlert(routerId: string, type: alertType) {
    const open = await this.prisma.networkAlert.findFirst({
      where: { routerId, type, status: "OPEN" },
    });
    if (open) {
      await this.prisma.networkAlert.update({
        where: { id: open.id },
        data: { status: "RESOLVED", resolvedAt: new Date() },
      });
    }
  }
}
