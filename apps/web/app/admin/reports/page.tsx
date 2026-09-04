import Link from "next/link";
import { prisma } from "@tz/database";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const [revenue, totalPayments, byMethod, byPackage] = await Promise.all([
    prisma.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true }, _count: true }),
    prisma.payment.count({ where: { status: "SUCCESS" } }),
    prisma.payment.groupBy({
      by: ["provider"],
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.voucher.groupBy({
      by: ["packageId"],
      _count: true,
    }),
  ]);

  const packages = await prisma.package.findMany({
    where: { id: { in: byPackage.map((b) => b.packageId) } },
    select: { id: true, name: true },
  });
  const pkgName = (id: string) => packages.find((p) => p.id === id)?.name || id;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
      <p className="mt-1 text-sm text-slate-500">Revenue and usage summary.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="text-sm text-slate-500">Total revenue (successful)</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {(revenue._sum.amount ? Number(revenue._sum.amount) : 0).toLocaleString()} TZS
          </div>
          <div className="mt-1 text-sm text-slate-400">{totalPayments} successful payments</div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-semibold text-slate-900">By payment method</h2>
          <div className="mt-3 space-y-2 text-sm">
            {byMethod.map((m) => (
              <div key={m.provider} className="flex items-center justify-between">
                <span className="text-slate-600">{m.provider}</span>
                <span className="font-medium text-slate-900">
                  {m._count} · {(m._sum.amount ? Number(m._sum.amount) : 0).toLocaleString()}
                </span>
              </div>
            ))}
            {byMethod.length === 0 && <div className="text-slate-400">No data yet.</div>}
          </div>
        </div>

        <div className="col-span-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-semibold text-slate-900">Vouchers by package</h2>
          <div className="mt-3 space-y-2 text-sm">
            {byPackage.map((b) => (
              <div key={b.packageId} className="flex items-center justify-between">
                <span className="text-slate-600">{pkgName(b.packageId)}</span>
                <span className="font-medium text-slate-900">{b._count}</span>
              </div>
            ))}
            {byPackage.length === 0 && <div className="text-slate-400">No vouchers yet.</div>}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">← Back to admin</Link>
      </div>
    </div>
  );
}
