import Link from "next/link";
import { prisma } from "@tz/database";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  SUCCESS: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-500",
  EXPIRED: "bg-slate-100 text-slate-500",
};

export default async function AdminPaymentsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { package: true, customer: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
      <p className="mt-1 text-sm text-slate-500">Recent payment transactions.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Package</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.reference}</td>
                <td className="px-4 py-3 text-slate-600">{p.customer?.fullName || p.customer?.phoneNumber || p.phoneNumber}</td>
                <td className="px-4 py-3 text-slate-600">{p.package?.name || "—"}</td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {p.amount.toLocaleString()} {p.currency}
                </td>
                <td className="px-4 py-3 text-slate-600">{p.provider}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status] || "bg-slate-100 text-slate-600"}`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No payments recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">← Back to admin</Link>
      </div>
    </div>
  );
}
