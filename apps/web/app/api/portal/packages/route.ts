import { prisma } from "@tz/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const packageId = searchParams.get("package") || "";

  // Resolve the default organization (first one); captive portal
  // operates within a single org context.
  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
  });

  try {
    if (packageId) {
      const pkg = await prisma.package.findUnique({
        where: { id: packageId },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          currency: true,
          durationSeconds: true,
          downloadMbps: true,
          uploadMbps: true,
          deviceLimit: true,
          siteId: true,
        },
      });
      if (!pkg) {
        return NextResponse.json({ error: "Package not found." }, { status: 404 });
      }
      return NextResponse.json({ data: { package: pkg } });
    }

    const packages = await prisma.package.findMany({
      where: {
        status: "ACTIVE",
        ...(org ? { organizationId: org.id } : {}),
      },
      orderBy: { price: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        durationSeconds: true,
        downloadMbps: true,
        uploadMbps: true,
        deviceLimit: true,
        siteId: true,
      },
    });

    return NextResponse.json({ data: { packages, organizationId: org?.id ?? null } });
  } catch (e) {
    console.error("portal packages error", e);
    return NextResponse.json({ error: "Failed to load packages." }, { status: 500 });
  }
}
