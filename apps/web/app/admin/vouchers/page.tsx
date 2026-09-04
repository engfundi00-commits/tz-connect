import Link from "next/link";
import { prisma } from "@tz/database";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  RESERVED: "bg-amber-100 text-amber-700",
  SOLD: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-indigo-100 text-indigo-700",
  EXPIRED: "bg-slate-100 text-slate-500",
  DISABLED: "bg-red-100 text-red-700",
};

export default async function AdminVouchersPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; page?: string }>;
}) {
  const session = await verifySession();
  if (!session) redirect("/login");

  const params = (await searchParams) ?? {};
  const page = Math.max(1, Number(params.page || 1));
  const limit = 50;
  const status = (params.status || "").toUpperCase() || undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [vouchers, total] = await prisma.$transaction([
    prisma.voucher.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { package: true, customer: true },
    }),
    prisma.voucher.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vouchers</h1>
          <p className="mt-1 text-sm text-slate-500">{total.toLocaleString()} total</p>
        </div>
        <Link
          href="/admin/vouchers/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Generate vouchers
        </Link>
      </div>

      <div className="mt-4 flex gap-2">
        {["AVAILABLE", "SOLD", "ACTIVE", "EXPIRED"].map((s) => (
          <a
            key={s}
            href={`/admin/vouchers?status=${s}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status === s ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {s}
          </a>
        ))}
        <a href="/admin/vouchers" className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
          All
        </a>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Package</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Expires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vouchers.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-medium text-slate-900">{v.code}</td>
                <td className="px-4 py-3 text-slate-600">{v.package?.name || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{v.customer?.fullName || v.customer?.phoneNumber || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[v.status] || "bg-slate-100 text-slate-600"}`}>
                    {v.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {v.expiresAt ? v.expiresAt.toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {vouchers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No vouchers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-slate-500">Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          {page > 1 && (
            <a href={`/admin/vouchers?page=${page - 1}${status ? `&status=${status}` : ""}`} className="rounded-lg bg-white px-3 py-1.5 text-slate-600 ring-1 ring-slate-200">
              Prev
            </a>
          )}
          {page < totalPages && (
            <a href={`/admin/vouchers?page=${page + 1}${status ? `&status=${status}` : ""}`} className="rounded-lg bg-white px-3 py-1.5 text-slate-600 ring-1 ring-slate-200">
              Next
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
