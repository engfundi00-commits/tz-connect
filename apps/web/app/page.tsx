import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
              TZ
            </div>
            <span className="text-lg font-semibold text-slate-900">
              TZ Connect <span className="text-brand-600">Wi-Fi</span>
            </span>
          </div>
          <nav>
            <Link
              href="/login"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Admin Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Connect now. <br className="sm:hidden" />
            Browse fast.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base md:text-lg text-brand-100">
            Buy a TZ Connect Wi-Fi voucher and get instant, metered internet at
            our hotspots across Tanzania. Quick, secure and affordable.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-56 rounded-xl bg-white px-6 py-3 font-semibold text-brand-700 shadow hover:bg-brand-50"
            >
              Get a voucher
            </Link>
            <Link
              href="/login"
              className="w-56 rounded-xl border border-white/40 bg-white/10 px-6 py-3 font-semibold text-white hover:bg-white/20"
            >
              Redeem your code
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <h2 className="text-center text-2xl font-bold text-slate-900">
          How it works
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Connect to the hotspot",
              text: "Join the TZ Connect Wi-Fi network from your device.",
            },
            {
              step: "2",
              title: "Choose a package",
              text: "Pick a plan and pay securely via mobile money.",
            },
            {
              step: "3",
              title: "Enter your voucher",
              text: "Get your code by SMS, enter it, and start browsing.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold">
                {item.step}
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} TZ Connect Wi-Fi. All rights
          reserved.
        </div>
      </footer>
    </main>
  );
}
