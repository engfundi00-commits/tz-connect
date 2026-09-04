import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { prisma } from "@tz/database";
import type { User, UserRole } from "@tz/database";

// =====================================================
// Session-based authentication (JWT in HttpOnly cookie)
// =====================================================

const AUTH_COOKIE = "tz_session";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  orgId: string;
}

export async function createSession(user: User): Promise<string> {
  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    orgId: user.organizationId,
  };
  const ttl = Number(process.env.SESSION_TTL_SECONDS || 604800);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(getSecret());
}

export async function setSessionCookie(token: string) {
  const maxAge = Number(process.env.SESSION_TTL_SECONDS || 604800);
  (await cookies()).set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(AUTH_COOKIE)?.value ?? null;
}

export async function verifySession(): Promise<SessionPayload | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await verifySession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.sub } });
}
