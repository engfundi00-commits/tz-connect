"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function PortalVoucherPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function validate() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/portal/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, activate: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Invalid voucher code.");
        setLoading(false);
        return;
      }
      setLoading(false);
      router.replace(
        `/portal/success?voucher=${encodeURIComponent(trimmed)}&redirect=${encodeURIComponent(redirect)}`
      );
    } catch {
      setError("Could not validate your voucher. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-2xl">
        🎫
      </div>
      <h1 className="mt-3 text-xl font-bold text-slate-900">Ingiza Voucher</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enter the voucher code you received to connect to internet.
      </p>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="VOUCHER-CODE"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-xl tracking-widest uppercase focus:border-brand-500 focus:outline-none"
        />
        <button
          onClick={validate}
          disabled={loading || code.trim().length < 4}
          className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Connecting…" : "Connect"}
        </button>
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      </div>

      <p className="mt-5 text-sm text-slate-500">
        No voucher yet?{" "}
        <Link href={redirect ? `/portal?redirect=${encodeURIComponent(redirect)}` : "/portal"} className="text-brand-600 underline">
          Buy one now
        </Link>
      </p>
    </div>
  );
}

export default function VoucherPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-slate-500">Loading…</div>}>
      <PortalVoucherPage />
    </Suspense>
  );
}
