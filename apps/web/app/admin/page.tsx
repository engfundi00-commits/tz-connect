import Link from "next/link";
import { prisma } from "@tz/database";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [orgs, customers, activeVouchers, todayPayments, payments, openAlerts, routers] =
    await Promise.all([
      prisma.organization.count(),
      prisma.customer.count(),
      prisma.voucher.count({ where: { status: "ACTIVE" } }),
      prisma.payment.count({
        where: { status: "SUCCESS", completedAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
      }),
      prisma.payment.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amount: true },
      }),
      prisma.networkAlert.count({ where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),
      prisma.router.count(),
    ]);

  const cards = [
    { label: "Customers", value: customers.toLocaleString(), href: "/admin/customers" },
    { label: "Active Vouchers", value: activeVouchers.toLocaleString(), href: "/admin/vouchers" },
    { label: "Payments (24h)", value: todayPayments.toLocaleString(), href: "/admin/payments" },
    { label: "Revenue", value: (payments._sum.amount ? Number(payments._sum.amount) : 0).toLocaleString(), href: "/admin/reports" },
    { label: "Open Alerts", value: openAlerts.toLocaleString(), href: "/admin/network/routers" },
    { label: "Routers", value: routers.toLocaleString(), href: "/admin/network/routers" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Overview of your TZ Connect Wi-Fi network ({orgs} organization{orgs !== 1 ? "s" : ""}).
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-300"
          >
            <div className="text-sm text-slate-500">{c.label}</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{c.value}</div>
            <div className="mt-2 text-xs font-medium text-brand-600">View →</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-semibold text-slate-900">Quick actions</h2>
          <div className="mt-3 grid gap-2">
            <Link href="/admin/vouchers/new" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Generate vouchers
            </Link>
            <Link href="/admin/customers" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Manage customers
            </Link>
            <Link href="/admin/packages" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Manage packages
            </Link>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-semibold text-slate-900">Network status</h2>
          <p className="mt-2 text-sm text-slate-500">
            {routers === 0
              ? "No routers configured yet."
              : `${openAlerts} open alert${openAlerts !== 1 ? "s" : ""} across ${routers} router${routers !== 1 ? "s" : ""}.`}
          </p>
          <Link href="/admin/network/routers" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
            View network →
          </Link>
        </section>
      </div>
    </div>
  );
}
