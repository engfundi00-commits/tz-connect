import Link from "next/link";
import { prisma } from "@tz/database";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
      <p className="mt-1 text-sm text-slate-500">Administrative and security events.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">{l.createdAt.toLocaleString()}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{l.action}</td>
                <td className="px-4 py-3 text-slate-600">{l.actorId ? l.actorId.slice(0, 8) : "system"}</td>
                <td className="px-4 py-3 text-slate-600">{l.entity || "—"}</td>
                <td className="px-4 py-3 text-slate-500">{l.ipAddress || "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No audit events recorded yet.
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
