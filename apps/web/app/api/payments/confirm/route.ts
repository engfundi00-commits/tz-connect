import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServices } from "@tz/services";
import { isMockMode } from "@tz/payments";

export const dynamic = "force-dynamic";

/**
 * Portal "I have paid" confirmation endpoint.
 *
 * In MOCK mode this simulates the payment provider's own
 * webhook callback (with the correct shared-secret signature)
 * so the authoritative, idempotent fulfilment path in
 * PaymentService.handleWebhook runs exactly as it would in
 * production. The browser is therefore never trusted to mark
 * a payment as success directly.
 *
 * In LIVE mode unknown to us (fail closed), the browser
 * cannot finalise a payment — only a real verified provider
 * webhook may do so.
 */
export async function POST(request: Request) {
  let body: { paymentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.paymentId) {
    return NextResponse.json({ error: "paymentId is required." }, { status: 400 });
  }

  try {
    const services = getServices();
    const payment = await services.prisma.payment.findUnique({
      where: { id: body.paymentId },
      include: { package: true },
    });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }

    if (!isMockMode()) {
      // Live mode: do not finalise from the browser. The real
      // provider webhook must arrive asynchronously.
      return NextResponse.json(
        { error: "Payment is being verified by the provider. Please wait." },
        { status: 202 }
      );
    }

    // Build a mock webhook envelope identical to what the
    // mock provider would send, signed with the shared secret.
    const txId = payment.providerTransactionId ?? `MOCK-${Date.now()}`;
    const amount = payment.amount;
    const status = "SUCCESS";
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || "tokomock-secret";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${status}${txId}${amount}`)
      .digest("hex");

    const result = await services.paymentService.handleWebhook(payment.provider, {
      headers: { "x-tz-signature": signature, "content-type": "application/json" },
      body: {
        status,
        transaction_id: txId,
        amount,
        payment_id: payment.id,
        paymentId: payment.id,
      },
    });

    if (!result.fulfilled) {
      return NextResponse.json(
        { error: "Payment could not be confirmed yet." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: {
        paymentId: payment.id,
        status: "SUCCESS",
        voucherCode: result.voucherCode,
        alreadyFulfilled: result.alreadyFulfilled,
      },
    });
  } catch (e) {
    console.error("payment confirm error", e);
    return NextResponse.json({ error: "Could not confirm payment." }, { status: 500 });
  }
}
