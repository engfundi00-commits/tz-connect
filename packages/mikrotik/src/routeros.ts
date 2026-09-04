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
import { RouterOSClient } from "./client";

// =====================================================
// RouterOS Controller (real implementation)
// =====================================================
//
// Implements MikroTikController against the RouterOS API
// protocol. Used in production. Credentials are supplied
// via config (from env or encrypted DB), never exposed.

function bigintOrZero(v: string | undefined): bigint {
  if (!v) return 0n;
  const n = BigInt(v);
  return Number.isNaN(Number(v)) ? 0n : n;
}

function secondsFromUptime(uptime: string | undefined): number {
  // RouterOS uptime strings e.g. "3d21:44:05" or "1w2d"
  if (!uptime) return 0;
  const weeks = parseInt(uptime.match(/(\d+)w/)?.[1] ?? "0", 10);
  const days = parseInt(uptime.match(/(\d+)d/)?.[1] ?? "0", 10);
  const time = uptime.match(/(\d+):(\d+):(\d+)/);
  const h = time ? parseInt(time[1], 10) : 0;
  const m = time ? parseInt(time[2], 10) : 0;
  const s = time ? parseInt(time[3], 10) : 0;
  return weeks * 7 * 86400 + days * 86400 + h * 3600 + m * 60 + s;
}

export class RouterOSController implements MikroTikController {
  readonly config: RouterConnectionConfig;

  constructor(config: RouterConnectionConfig) {
    this.config = config;
  }

  private newClient(): RouterOSClient {
    return new RouterOSClient(this.config);
  }

  async ping(): Promise<boolean> {
    const client = this.newClient();
    try {
      await client.connect();
      await client.close();
      return true;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<RouterStatus> {
    try {
      const health = await this.getHealth();
      return { online: true, health };
    } catch (e) {
      return { online: false, error: (e as Error).message };
    }
  }

  async getHealth(): Promise<RouterHealth> {
    const client = this.newClient();
    try {
      const [resource] = await client.command(["/system/resource/print"]);
      const identity = (
        await client.command(["/system/identity/print"])
      )[0]?.name;
      return {
        cpuLoad: parseInt(resource["cpu-load"] ?? "0", 10),
        freeMemory: parseInt(resource["free-memory"] ?? "0", 10),
        totalMemory: parseInt(resource["total-memory"] ?? "0", 10),
        uptimeSeconds: secondsFromUptime(resource.uptime),
        version: resource.version ?? "",
        identity: identity ?? "",
        freeHdd: parseInt(resource["free-hdd-space"] ?? "0", 10),
        totalHdd: parseInt(resource["total-hdd-space"] ?? "0", 10),
      };
    } finally {
      await client.close();
    }
  }

  async getSystemResource(): Promise<RouterOSMap> {
    const client = this.newClient();
    try {
      const [resource] = await client.command(["/system/resource/print"]);
      return resource;
    } finally {
      await client.close();
    }
  }

  async getInterfaces(): Promise<InterfaceStats[]> {
    const client = this.newClient();
    try {
      const rows = await client.command(["/interface/print", "=detail="]);
      return rows.map((r) => ({
        name: r.name ?? "",
        type: r.type ?? "",
        rxBytes: bigintOrZero(r["rx-byte"]),
        txBytes: bigintOrZero(r["tx-byte"]),
        rxBps: bigintOrZero(r["rx-bps"] ?? r["rx-bit-rate"]),
        txBps: bigintOrZero(r["tx-bps"] ?? r["tx-bit-rate"]),
        running: r.running === "true",
        linkDowns: parseInt(r["link-downs"] ?? "0", 10),
      }));
    } finally {
      await client.close();
    }
  }

  async listHotspotUsers(): Promise<HotspotUser[]> {
    const client = this.newClient();
    try {
      const rows = await client.command(["/ip/hotspot/user/print", "=detail="]);
      return rows.map((r) => ({
        name: r.name ?? "",
        password: r.password ?? "",
        profile: r.profile ?? "",
        limitBytesTotal: bigintOrZero(r["limit-bytes-total"]),
        limitUptime: r["limit-uptime"],
        disabled: r.disabled === "true",
        comment: r.comment,
      }));
    } finally {
      await client.close();
    }
  }

  async getActiveSessions(): Promise<ActiveSession[]> {
    const client = this.newClient();
    try {
      const rows = await client.command(["/ip/hotspot/active/print"]);
      return rows.map((r) => ({
        user: r.user ?? "",
        address: r.address ?? "",
        macAddress: r["mac-address"] ?? "",
        uptime: r.uptime ?? "",
        bytesIn: bigintOrZero(r["bytes-in"]),
        bytesOut: bigintOrZero(r["bytes-out"]),
        idleTime: r["idle-time"] ?? "",
        limitBytesOut: bigintOrZero(r["limit-bytes-out"]),
      }));
    } finally {
      await client.close();
    }
  }

  async createHotspotUser(user: HotspotUser): Promise<void> {
    const client = this.newClient();
    try {
      const words = [
        "/ip/hotspot/user/add",
        `=name=${user.name}`,
        `=password=${user.password}`,
        `=profile=${user.profile}`,
      ];
      if (user.limitBytesTotal && user.limitBytesTotal > 0n) {
        words.push(`=limit-bytes-total=${user.limitBytesTotal}`);
      }
      if (user.limitUptime) words.push(`=limit-uptime=${user.limitUptime}`);
      if (user.comment) words.push(`=comment=${user.comment}`);
      await client.command(words);
    } finally {
      await client.close();
    }
  }

  async disableHotspotUser(name: string): Promise<void> {
    const client = this.newClient();
    try {
      await client.command(["/ip/hotspot/user/set", `=name=${name}`, "=disabled=yes"]);
    } finally {
      await client.close();
    }
  }

  async enableHotspotUser(name: string): Promise<void> {
    const client = this.newClient();
    try {
      await client.command(["/ip/hotspot/user/set", `=name=${name}`, "=disabled=no"]);
    } finally {
      await client.close();
    }
  }

  async disconnectUser(name: string): Promise<void> {
    const client = this.newClient();
    try {
      const active = await client.command(["/ip/hotspot/active/print", `?user=${name}`]);
      for (const a of active) {
        const id = a[".id"];
        if (id) {
          await client.command(["/ip/hotspot/active/remove", `=.id=${id}`]);
        }
      }
    } finally {
      await client.close();
    }
  }

  async listProfiles(): Promise<string[]> {
    const client = this.newClient();
    try {
      const rows = await client.command(["/ip/hotspot/user/profile/print"]);
      return rows.map((r) => r.name ?? "").filter(Boolean);
    } finally {
      await client.close();
    }
  }

  async reboot(): Promise<void> {
    const client = this.newClient();
    try {
      await client.command(["/system/reboot", "=yes="]);
    } finally {
      await client.close();
    }
  }
}
