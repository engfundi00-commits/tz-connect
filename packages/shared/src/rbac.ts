import type { UserRole } from "@tz/database";

// =====================================================
// RBAC — Role-based access control
// =====================================================

export type Permission =
  | "customers.read"
  | "customers.create"
  | "customers.update"
  | "customers.block"
  | "packages.read"
  | "packages.create"
  | "packages.update"
  | "packages.delete"
  | "vouchers.read"
  | "vouchers.create"
  | "vouchers.bulkCreate"
  | "vouchers.sell"
  | "vouchers.disable"
  | "vouchers.activate"
  | "payments.read"
  | "payments.create"
  | "payments.verify"
  | "reports.read"
  | "reports.export"
  | "network.read"
  | "network.manage"
  | "routers.read"
  | "routers.manage"
  | "switches.read"
  | "switches.manage"
  | "accessPoints.read"
  | "accessPoints.manage"
  | "sessions.read"
  | "sessions.disconnect"
  | "alerts.read"
  | "alerts.manage"
  | "auditLogs.read"
  | "users.manage"
  | "settings.manage"
  | "notifications.read"
  | "sales.read"
  | "sales.sell"
  | "monitoring.read";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "customers.read", "customers.create", "customers.update", "customers.block",
    "packages.read", "packages.create", "packages.update", "packages.delete",
    "vouchers.read", "vouchers.create", "vouchers.bulkCreate", "vouchers.sell",
    "vouchers.disable", "vouchers.activate",
    "payments.read", "payments.create", "payments.verify",
    "reports.read", "reports.export",
    "network.read", "network.manage",
    "routers.read", "routers.manage",
    "switches.read", "switches.manage",
    "accessPoints.read", "accessPoints.manage",
    "sessions.read", "sessions.disconnect",
    "alerts.read", "alerts.manage",
    "auditLogs.read",
    "users.manage",
    "settings.manage",
    "notifications.read",
    "sales.read", "sales.sell",
    "monitoring.read",
  ],
  ADMIN: [
    "customers.read", "customers.create", "customers.update", "customers.block",
    "packages.read", "packages.create", "packages.update",
    "vouchers.read", "vouchers.create", "vouchers.bulkCreate", "vouchers.sell",
    "vouchers.disable", "vouchers.activate",
    "payments.read", "payments.create", "payments.verify",
    "reports.read", "reports.export",
    "network.read",
    "routers.read",
    "switches.read",
    "accessPoints.read",
    "sessions.read",
    "alerts.read",
    "auditLogs.read",
    "notifications.read",
    "sales.read", "sales.sell",
    "monitoring.read",
  ],
  AGENT: [
    "vouchers.read",
    "vouchers.sell",
    "vouchers.create",
    "sales.read",
    "sales.sell",
    "customers.read",
    "payments.read",
    "packages.read",
  ],
  NETWORK_OPERATOR: [
    "network.read", "network.manage",
    "routers.read", "routers.manage",
    "switches.read", "switches.manage",
    "accessPoints.read", "accessPoints.manage",
    "sessions.read", "sessions.disconnect",
    "alerts.read", "alerts.manage",
    "monitoring.read",
    "network.manage",
  ],
  REPORT_VIEWER: ["reports.read", "reports.export", "sales.read"],
};

export function permissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}

export function assertCan(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    const err = new Error("Forbidden: insufficient permissions");
    (err as any).status = 403;
    throw err;
  }
}

export { ROLE_PERMISSIONS };
