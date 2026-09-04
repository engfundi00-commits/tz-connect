import Link from "next/link";
import { prisma } from "@tz/database";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  ONLINE: "bg-green-100 text-green-700",
  OFFLINE: "bg-red-100 text-red-700",
  UNKNOWN: "bg-slate-100 text-slate-500",
};

export default async function AdminRoutersPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const routers = await prisma.router.findMany({ include: { site: true } });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Routers</h1>
      <p className="mt-1 text-sm text-slate-500">Network devices and their health.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {routers.map((r) => (
          <div key={r.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-slate-900">{r.name}</div>
                <div className="mt-1 text-xs text-slate-500">{r.ipAddress} · {r.site?.name || "—"}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status] || "bg-slate-100 text-slate-500"}`}>
                {r.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <div className="text-slate-400">CPU</div>
                <div>{r.cpuUsage != null ? `${Math.round(Number(r.cpuUsage))}%` : "—"}</div>
              </div>
              <div>
                <div className="text-slate-400">Uptime</div>
                <div>{r.uptimeSeconds != null ? `${Math.round(Number(r.uptimeSeconds) / 3600)}h` : "—"}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-400">
              Last seen: {r.lastSeenAt ? r.lastSeenAt.toLocaleString() : "never"}
            </div>
          </div>
        ))}
        {routers.length === 0 && (
          <div className="col-span-full rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm ring-1 ring-slate-200">
            No routers configured yet. Add routers via the API or seed script.
          </div>
        )}
      </div>

      <div className="mt-6">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">← Back to admin</Link>
      </div>
    </div>
  );
}
