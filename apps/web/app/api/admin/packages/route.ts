import { NextResponse } from "next/server";
import { requirePermission, handleApiError } from "@/lib/auth/authorize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user } = await requirePermission("packages.read");
    const { getServices } = await import("@tz/services");
    const services = getServices();

    const packages = await services.prisma.package.findMany({
      where: { status: "ACTIVE", organizationId: user.orgId },
      orderBy: { price: "asc" },
      select: { id: true, name: true, price: true, currency: true },
    });

    return NextResponse.json({ data: { packages } });
  } catch (e) {
    return handleApiError(e);
  }
}
