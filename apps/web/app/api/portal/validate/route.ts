import { NextResponse } from "next/server";
import { getServices } from "@tz/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { code?: string; activate?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const code = (body.code || "").trim().toUpperCase();
  if (!code || code.length < 4) {
    return NextResponse.json({ error: "Please enter your voucher code." }, { status: 400 });
  }

  try {
    const services = getServices();
    const voucher = await services.voucherService.validateVoucher(code, {
      activate: body.activate !== false,
    });

    if (!voucher) {
      return NextResponse.json(
        { error: "This voucher is invalid, expired, or already used." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        voucher: {
          code: voucher.code,
          status: voucher.status,
          expiresAt: voucher.expiresAt,
          packageName:
            (voucher as { package?: { name: string | null } | null }).package
              ?.name ?? null,
        },
      },
    });
  } catch (e) {
    console.error("portal validate error", e);
    return NextResponse.json({ error: "Could not validate your voucher." }, { status: 500 });
  }
}
