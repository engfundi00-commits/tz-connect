import { NextResponse } from "next/server";
import { getServices } from "@tz/services";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const services = getServices();
    const payment = await services.paymentService.get(id);
    if (!payment) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }
    return NextResponse.json({
      data: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
        reference: payment.reference,
        providerTransactionId: payment.providerTransactionId,
        packageName: payment.package?.name ?? null,
        vouchers: payment.vouchers?.map((v) => ({ code: v.code, status: v.status })) ?? [],
      },
    });
  } catch (e) {
    console.error("payment status error", e);
    return NextResponse.json({ error: "Could not load payment." }, { status: 500 });
  }
}
