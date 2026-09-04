import { PaymentMethod } from "@tz/database";
import { NextResponse } from "next/server";
import { getServices } from "@tz/services";

export const dynamic = "force-dynamic";

const ALLOWED_METHODS: ReadonlySet<PaymentMethod> = new Set([
  PaymentMethod.MPESA,
  PaymentMethod.AIRTEL_MONEY,
  PaymentMethod.MIXX_BY_YAS,
  PaymentMethod.HALOPESA,
]);

export async function POST(request: Request) {
  let body: {
    packageId?: string;
    phoneNumber?: string;
    paymentMethod?: string;
    siteId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.packageId || !body.phoneNumber) {
    return NextResponse.json({ error: "packageId and phoneNumber are required." }, { status: 400 });
  }

  const method = body.paymentMethod as PaymentMethod;
  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ error: "Unsupported payment method." }, { status: 400 });
  }

  try {
    const services = getServices();

    const org = await services.prisma.organization.findFirst({
      orderBy: { createdAt: "asc" },
    });
    if (!org) {
      return NextResponse.json(
        { error: "No organization configured. Seed the database first." },
        { status: 500 }
      );
    }

    const payment = await services.paymentService.initiate({
      packageId: body.packageId,
      phoneNumber: body.phoneNumber,
      paymentMethod: method,
      siteId: body.siteId || null,
      organizationId: org.id,
      initiatedBy: "portal",
    });

    return NextResponse.json(
      {
        data: {
          id: payment.id,
          status: payment.status,
          reference: payment.reference,
          providerTransactionId: payment.providerTransactionId,
          amount: payment.amount,
          currency: payment.currency,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not initiate payment.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
