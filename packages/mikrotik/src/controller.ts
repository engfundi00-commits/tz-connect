// =====================================================
// MikroTik Router Interface
// =====================================================
//
// Represents the operations the platform can perform on a
// MikroTik hotspot router. Multiple routers are supported;
// each controller is constructed with a unique config.
//
// The transport layer handles the RouterOS API protocol.
// A MockTransport exists ONLY for development/testing and
// is never selected in production mode.

export interface RouterConnectionConfig {
  host: string;
  apiPort?: number;
  apiSecurePort?: number;
  username: string;
  password: string;
  tls?: boolean;
  timeoutMs?: number;
}

export interface RouterHealth {
  cpuLoad: number;
  freeMemory: number;
  totalMemory: number;
  uptimeSeconds: number;
  version: string;
  identity: string;
  freeHdd: number;
  totalHdd: number;
}

export interface RouterStatus {
  online: boolean;
  health?: RouterHealth;
  error?: string;
}

export interface InterfaceStats {
  name: string;
  type: string;
  rxBytes: bigint;
  txBytes: bigint;
  rxBps: bigint;
  txBps: bigint;
  running: boolean;
  linkDowns: number;
}

export interface HotspotUser {
  name: string;
  password: string;
  profile: string;
  limitBytesTotal?: bigint;
  limitUptime?: string;
  disabled?: boolean;
  comment?: string;
}

export interface ActiveSession {
  user: string;
  address: string;
  macAddress: string;
  uptime: string;
  bytesIn: bigint;
  bytesOut: bigint;
  idleTime: string;
  limitBytesOut?: bigint;
}

// A minimal RouterOS "print" result map
export type RouterOSMap = Record<string, string>;

export interface MikroTikController {
  readonly config: RouterConnectionConfig;

  ping(): Promise<boolean>;
  getStatus(): Promise<RouterStatus>;
  getHealth(): Promise<RouterHealth>;
  getInterfaces(): Promise<InterfaceStats[]>;
  listHotspotUsers(): Promise<HotspotUser[]>;
  getActiveSessions(): Promise<ActiveSession[]>;
  createHotspotUser(user: HotspotUser): Promise<void>;
  disableHotspotUser(name: string): Promise<void>;
  enableHotspotUser(name: string): Promise<void>;
  disconnectUser(name: string): Promise<void>;
  listProfiles(): Promise<string[]>;
  reboot(): Promise<void>;
  getSystemResource(): Promise<RouterOSMap>;
}
