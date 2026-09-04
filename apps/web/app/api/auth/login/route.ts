import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@tz/database";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit({ key: `login:${ip}`, max: 10, windowMs: 60000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    await audit({ action: "AUTH_FAILED", entity: "User", metadata: { email }, ipAddress: ip });
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await audit({ action: "AUTH_FAILED", actorId: user.id, entity: "User", entityId: user.id, metadata: { email }, ipAddress: ip });
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  if (!user.organizationId) {
    return NextResponse.json(
      { error: "Account is not linked to an organization." },
      { status: 403 }
    );
  }

  const token = await createSession(user);
  await setSessionCookie(token);

  await audit({
    action: "AUTH_LOGIN",
    actorId: user.id,
    entity: "User",
    entityId: user.id,
    organizationId: user.organizationId,
    ipAddress: ip,
  });

  return NextResponse.json({
    data: {
      user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
    },
  });
}
