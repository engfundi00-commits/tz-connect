import { prisma } from "@tz/database";
import { AuditActionType } from "@tz/database";

// =====================================================
// Audit Logging
// =====================================================
//
// Never log secrets. Log actionable administrative events.

export async function audit(opts: {
  actorId?: string | null;
  action: AuditActionType;
  entity?: string | null;
  entityId?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  organizationId?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: opts.actorId ?? null,
        action: opts.action,
        entity: opts.entity ?? null,
        entityId: opts.entityId ?? null,
        metadata: opts.metadata ?? undefined,
        ipAddress: opts.ipAddress ?? null,
        userAgent: opts.userAgent ?? null,
        organizationId: opts.organizationId ?? null,
      },
    });
  } catch (e) {
    // Audit failures must not break the primary operation.
    console.error("Failed to write audit log", e);
  }
}
