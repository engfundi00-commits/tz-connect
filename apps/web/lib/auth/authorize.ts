import { NextResponse } from "next/server";
import { assertCan, type Permission } from "@tz/shared";
import { prisma } from "@tz/database";
import { verifySession } from "./session";

// =====================================================
// Server-side authorization for API route handlers
// =====================================================
//
// Never rely on the frontend for authorization. Each route
// calls requirePermission() before acting.

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function requirePermission(
  permission: Permission
): Promise<{ user: NonNullable<Awaited<ReturnType<typeof verifySession>>>; }> {
  const session = await verifySession();
  if (!session) {
    throw new ApiError(401, "Unauthorized");
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || !user.isActive) {
    throw new ApiError(401, "Unauthorized");
  }

  assertCan(user.role, permission); // throws 403 on insufficient perms
  return { user: { sub: user.id, email: user.email, role: user.role, orgId: user.organizationId } };
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.status }
    );
  }
  if (
    error instanceof Error &&
    typeof (error as Error & { status?: number }).status === "number" &&
    (error as Error & { status?: number }).status === 403
  ) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  const zodError = (error as Error & { issues?: unknown[] })?.issues;
  if (Array.isArray(zodError)) {
    return NextResponse.json(
      { error: "Validation error", details: zodError },
      { status: 400 }
    );
  }
  console.error("Unhandled API error", error);
  return NextResponse.json(
    { error: "Internal Server Error" },
    { status: 500 }
  );
}
