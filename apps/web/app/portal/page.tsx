import Link from "next/link";
import { prisma } from "@tz/database";

export const dynamic = "force-dynamic";

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDuration(seconds: number): string {
  const h = seconds / 3600;
  if (h >= 24 && h % 24 === 0) return `${Math.round(h / 24)} ${Math.round(h / 24) === 1 ? "day" : "days"}`;
  if (h === 1) return "1 hour";
  return `${Math.round(h)} hours`;
}

export default async function PortalHomePage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect?: string; site?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const redirect = params.redirect || "";

  let packages: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    durationSeconds: number;
    downloadMbps: number | null;
    uploadMbps: number | null;
    deviceLimit: number;
    siteId: string | null;
  }[] = [];
  let dbError = false;

  try {
    packages = await prisma.package.findMany({
      where: { status: "ACTIVE" },
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
  } catch {
    dbError = true;
  }

  return (
    <div>
      {/* Welcome */}
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow">
        <h1 className="text-2xl font-bold">Karibu 👋</h1>
        <p className="mt-1 text-sm text-brand-100">
          You are connected to <strong>TZ Connect Wi-Fi</strong>. Choose a
          package to get online — quick and easy.
        </p>
      </section>

      {/* Voucher ingress */}
      <Link
        href={`/portal/voucher?redirect=${encodeURIComponent(redirect)}`}
        className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div>
          <div className="font-semibold text-slate-900">Ingiza Voucher</div>
          <div className="text-sm text-slate-500">
            Already have a voucher? Enter your code to connect.
          </div>
        </div>
        <span className="text-brand-600 text-xl">→</span>
      </Link>

      {/* Packages */}
      <h2 className="mt-6 text-lg font-semibold text-slate-900">
        Choose a package
      </h2>

      {dbError && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Unable to load packages right now. Please retry in a moment.
        </div>
      )}

      {!dbError && packages.length === 0 && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No packages available at this hotspot yet. Please check back soon or
          contact support.
        </div>
      )}

      <div className="mt-3 space-y-3">
        {packages.map((pkg) => (
          <Link
            key={pkg.id}
            href={`/portal/pay?package=${pkg.id}&redirect=${encodeURIComponent(redirect)}`}
            className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-400"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-slate-900">{pkg.name}</div>
                {pkg.description && (
                  <div className="mt-1 text-sm text-slate-500">
                    {pkg.description}
                  </div>
                )}
              </div>
              <div className="text-lg font-bold text-brand-600">
                {formatPrice(pkg.price, pkg.currency)}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              <span className="flex items-center gap-1">⏱ {formatDuration(pkg.durationSeconds)}</span>
              {pkg.downloadMbps && (
                <span className="flex items-center gap-1">↓ {pkg.downloadMbps} Mbps</span>
              )}
              {pkg.uploadMbps && (
                <span className="flex items-center gap-1">↑ {pkg.uploadMbps} Mbps</span>
              )}
              <span className="flex items-center gap-1">📱 {pkg.deviceLimit} device{pkg.deviceLimit > 1 ? "s" : ""}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
