import type { Metadata, Viewport } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TZ Connect Wi-Fi",
  description:
    "Get online now with TZ Connect Wi-Fi. Buy a voucher or enter your existing code.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ea580c",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur shadow-sm">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-white text-sm font-bold">
            TZ
          </div>
          <span className="text-base font-semibold text-slate-900">
            TZ Connect <span className="text-brand-600">Wi-Fi</span>
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-5 pb-24">{children}</main>
      <footer className="fixed inset-x-0 bottom-0 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
        <div className="mx-auto max-w-md px-4 py-2 text-center text-xs text-slate-500">
          Need help? <Link href="/portal/support" className="text-brand-600 underline">Contact support</Link>
          {" · "}
          <a href="http://tzconnect.co.tz" className="text-slate-400">tzconnect.co.tz</a>
        </div>
      </footer>
    </div>
  );
}
