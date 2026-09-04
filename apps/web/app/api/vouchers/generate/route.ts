import { NextResponse } from "next/server";
import { getServices } from "@tz/services";
import { requirePermission, handleApiError } from "@/lib/auth/authorize";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { user } = await requirePermission("vouchers.bulkCreate");
    const body = await request.json();
    const packageId = body.packageId as string;
    const quantity = Math.min(1000, Math.max(1, Math.floor(Number(body.quantity) || 1)));

    if (!packageId) {
      return NextResponse.json({ error: "packageId is required." }, { status: 400 });
    }

    const services = getServices();
    const pkg = await services.prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg) {
      return NextResponse.json({ error: "Package not found." }, { status: 404 });
    }
    if (pkg.organizationId !== user.orgId) {
      return NextResponse.json({ error: "Package not in your organization." }, { status: 403 });
    }

    const vouchers = await services.voucherService.generateBulkVouchers({
      packageId,
      organizationId: user.orgId,
      generatedBy: user.sub,
      quantity,
    });

    await audit({
      actorId: user.sub,
      action: "VOUCHER_GENERATE",
      entity: "Voucher",
      metadata: { packageId, quantity },
      organizationId: user.orgId,
    });

    return NextResponse.json({
      data: { count: vouchers.length, vouchers: vouchers.map((v) => v.code) },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
