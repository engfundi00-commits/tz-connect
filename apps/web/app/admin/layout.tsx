import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession, getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/admin/logout-button";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/customers", label: "Customers", icon: "👥" },
  { href: "/admin/packages", label: "Packages", icon: "📦" },
  { href: "/admin/vouchers", label: "Vouchers", icon: "🎫" },
  { href: "/admin/payments", label: "Payments", icon: "💳" },
  { href: "/admin/network/routers", label: "Routers", icon: "🌐" },
  { href: "/admin/reports", label: "Reports", icon: "📈" },
  { href: "/admin/audit", label: "Audit Log", icon: "📜" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-white text-sm font-bold">
            TZ
          </div>
          <span className="font-semibold text-slate-900">TZ Connect Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="px-3 py-2 text-sm">
            <div className="font-medium text-slate-900">{user?.fullName || user?.email}</div>
            <div className="text-xs text-slate-500 capitalize">{user?.role.toLowerCase()}</div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <span className="font-semibold text-slate-900">TZ Connect Admin</span>
          <LogoutButton compact />
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
