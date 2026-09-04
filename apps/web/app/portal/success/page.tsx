import Link from "next/link";

export default async function PortalSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ voucher?: string; redirect?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const voucher = params.voucher || "";
  const redirect = params.redirect || "";

  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 text-3xl">
        ✓
      </div>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">You have internet!</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your voucher is ready. Use it to sign in if needed.
      </p>

      <div className="mt-5 rounded-2xl border-2 border-brand-200 bg-white p-5 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-slate-400">Your voucher code</div>
        <div className="mt-1 text-3xl font-bold tracking-widest text-brand-700">
          {voucher}
        </div>
        <div className="mt-3 text-xs text-slate-400">
          This code was also sent to your phone by SMS.
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <a
          href={redirect || "http://www.google.com"}
          className="block w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
        >
          Start browsing
        </a>
        <Link
          href="/portal"
          className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
