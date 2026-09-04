import Link from "next/link";
import { prisma } from "@tz/database";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminPackagesPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const packages = await prisma.package.findMany({
    where: { status: "ACTIVE" },
    orderBy: { price: "asc" },
    include: { site: true, _count: { select: { vouchers: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Packages</h1>
        <span className="text-sm text-slate-500">{packages.length} active</span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((p) => (
          <div key={p.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-slate-900">{p.name}</div>
                <div className="mt-1 text-xs text-slate-500">{p.description}</div>
              </div>
              <div className="text-lg font-bold text-brand-600">
                {p.price.toLocaleString()} {p.currency}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
              <span>⏱ {Math.round(p.durationSeconds / 3600)}h</span>
              {p.downloadMbps && <span>↓ {p.downloadMbps} Mbps</span>}
              <span>📱 {p.deviceLimit} device</span>
              <span>🎫 {p._count.vouchers}</span>
            </div>
            <div className="mt-3 text-xs text-slate-400">{p.site?.name || "All sites"}</div>
          </div>
        ))}
        {packages.length === 0 && (
          <div className="col-span-full rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm ring-1 ring-slate-200">
            No active packages. Seed the database or add packages via the API.
          </div>
        )}
      </div>

      <div className="mt-6">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">← Back to admin</Link>
      </div>
    </div>
  );
}
