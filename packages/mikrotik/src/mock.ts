import type {
  MikroTikController,
  RouterConnectionConfig,
  RouterHealth,
  RouterStatus,
  InterfaceStats,
  HotspotUser,
  ActiveSession,
  RouterOSMap,
} from "./controller";
import { logger } from "@tz/shared";

// =====================================================
// MOCK MikroTik Controller
// =====================================================
//
// DEVELOPMENT / TESTING ONLY.
// Simulates a RouterOS hotspot router with in-memory state
// so the workspace can run without a real router.
//
// This is NEVER returned by the factory in production mode
// (MIKROTIK_MODE=live). It exists purely to exercise the
// application flow locally and in automated tests.

interface MockHotspotUser {
  name: string;
  password: string;
  profile: string;
  limitBytesTotal?: bigint;
  limitUptime?: string;
  disabled: boolean;
  comment?: string;
}

interface MockActiveSession {
  user: string;
  address: string;
  macAddress: string;
  bytesIn: bigint;
  bytesOut: bigint;
  limitBytesOut?: bigint;
  startedAt: number;
}

export class MockMikroTikController implements MikroTikController {
  readonly config: RouterConnectionConfig;
  readonly isMock = true;

  private users: MockHotspotUser[] = [];
  private sessions: Map<string, MockActiveSession> = new Map();
  private offline = false;

  constructor(config: RouterConnectionConfig) {
    this.config = config;
  }

  setOffline(offline: boolean) {
    this.offline = offline;
  }

  async ping(): Promise<boolean> {
    return !this.offline;
  }

  async getStatus(): Promise<RouterStatus> {
    if (this.offline) return { online: false, error: "mock router offline" };
    return { online: true, health: await this.getHealth() };
  }

  async getHealth(): Promise<RouterHealth> {
    return {
      cpuLoad: 12,
      freeMemory: 120 * 1024 * 1024,
      totalMemory: 256 * 1024 * 1024,
      uptimeSeconds: 3600 * 24 * 5,
      version: "7.14",
      identity: this.config.username,
      freeHdd: 100 * 1024 * 1024,
      totalHdd: 256 * 1024 * 1024,
    };
  }

  async getSystemResource(): Promise<RouterOSMap> {
    const h = await this.getHealth();
    return {
      "cpu-load": String(h.cpuLoad),
      "free-memory": String(h.freeMemory),
      "total-memory": String(h.totalMemory),
      uptime: "5d01:00:00",
      version: h.version,
    };
  }

  async getInterfaces(): Promise<InterfaceStats[]> {
    return [
      { name: "ether1", type: "ether", rxBytes: 123n, txBytes: 456n, rxBps: 1000n, txBps: 500n, running: true, linkDowns: 0 },
      { name: "wlan1", type: "wlan", rxBytes: 789n, txBytes: 101n, rxBps: 2000n, txBps: 1500n, running: !this.offline, linkDowns: 1 },
    ];
  }

  async listHotspotUsers(): Promise<HotspotUser[]> {
    return this.users.map((u) => ({ ...u }));
  }

  async getActiveSessions(): Promise<ActiveSession[]> {
    const out: ActiveSession[] = [];
    for (const s of this.sessions.values()) {
      out.push({
        user: s.user,
        address: s.address,
        macAddress: s.macAddress,
        uptime: `${Math.floor((Date.now() - s.startedAt) / 1000)}`,
        bytesIn: s.bytesIn,
        bytesOut: s.bytesOut,
        idleTime: "00:00:00",
        limitBytesOut: s.limitBytesOut,
      });
    }
    return out;
  }

  async createHotspotUser(user: HotspotUser): Promise<void> {
    if (this.sessions.has(user.name)) {
      // recreate by replacing
    }
    this.users = this.users.filter((u) => u.name !== user.name);
    this.users.push({
      name: user.name,
      password: user.password,
      profile: user.profile,
      limitBytesTotal: user.limitBytesTotal,
      limitUptime: user.limitUptime,
      disabled: false,
      comment: user.comment,
    });
    logger.info("[mock-mikrotik] created hotspot user", { name: user.name, profile: user.profile });
  }

  async disableHotspotUser(name: string): Promise<void> {
    const u = this.users.find((x) => x.name === name);
    if (u) u.disabled = true;
  }

  async enableHotspotUser(name: string): Promise<void> {
    const u = this.users.find((x) => x.name === name);
    if (u) u.disabled = false;
  }

  async disconnectUser(name: string): Promise<void> {
    this.sessions.delete(name);
  }

  async listProfiles(): Promise<string[]> {
    return ["default", "tz_connect_daily", "tz_connect_hourly"];
  }

  async reboot(): Promise<void> {
    this.offline = true;
    setTimeout(() => (this.offline = false), 5000);
  }

  addMockSession(session: ActiveSession) {
    this.sessions.set(session.user, {
      user: session.user,
      address: session.address,
      macAddress: session.macAddress,
      bytesIn: session.bytesIn,
      bytesOut: session.bytesOut,
      limitBytesOut: session.limitBytesOut,
      startedAt: Date.now(),
    });
  }
}
