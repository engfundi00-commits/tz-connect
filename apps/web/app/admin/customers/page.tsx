import Link from "next/link";
import { prisma } from "@tz/database";
import { redirect } from "next/navigation";
import { verifySession, getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-amber-100 text-amber-700",
  BLOCKED: "bg-red-100 text-red-700",
};

export default async function AdminCustomersPage() {
  const session = await verifySession();
  if (!session) redirect("/login");
  const user = await getCurrentUser();

  const customers = await prisma.customer.findMany({
    where: user?.role === "SUPER_ADMIN" ? {} : { organizationId: session.orgId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { site: true, _count: { select: { vouchers: true, payments: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <span className="text-sm text-slate-500">{customers.length} shown</span>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Vouchers</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {c.fullName || c.phoneNumber}
                </td>
                <td className="px-4 py-3 text-slate-600">{c.phoneNumber}</td>
                <td className="px-4 py-3 text-slate-600">{c.site?.name || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{c._count.vouchers}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status] || "bg-slate-100 text-slate-600"}`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No customers yet. They are created automatically on their first voucher purchase.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to admin
        </Link>
      </div>
    </div>
  );
}
