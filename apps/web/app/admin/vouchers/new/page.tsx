"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Pkg {
  id: string;
  name: string;
  price: number;
  currency: string;
}

export default function AdminVouchersNewPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [packageId, setPackageId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/packages")
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.packages) setPackages(j.data.packages);
      })
      .catch(() => setError("Could not load packages."))
      .finally(() => setLoading(false));
  }, []);

  async function generate() {
    if (!packageId) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/vouchers/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, quantity }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not generate vouchers.");
        return;
      }
      setResult(json.data.vouchers);
    } catch {
      setError("Could not generate vouchers.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Generate vouchers</h1>
      <p className="mt-1 text-sm text-slate-500">
        Create one or more prepaid vouchers for a package.
      </p>

      {loading && <div className="mt-6 text-slate-500">Loading packages…</div>}

      {!loading && (
        <div className="mt-6 max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div>
            <label className="block text-sm font-medium text-slate-700">Package</label>
            <select
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">Select a package…</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.price.toLocaleString()} {p.currency}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">Quantity</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
          <button
            onClick={generate}
            disabled={submitting || !packageId}
            className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? "Generating…" : "Generate vouchers"}
          </button>
        </div>
      )}

      {result && (
        <div className="mt-6 max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-semibold text-slate-900">
            Success — {result.length} voucher{result.length !== 1 ? "s" : ""}
          </h2>
          <div className="mt-3 space-y-1 font-mono text-sm">
            {result.map((c) => (
              <div key={c} className="text-brand-700">{c}</div>
            ))}
          </div>
          <button
            onClick={() => router.push("/admin/vouchers")}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            View vouchers
          </button>
        </div>
      )}
    </div>
  );
}
