"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type PayMethod = "MPESA" | "AIRTEL_MONEY" | "MIXX_BY_YAS" | "HALOPESA";

const METHODS: { id: PayMethod; label: string; hint: string }[] = [
  { id: "MPESA", label: "M-Pesa", hint: "Pay with M-Pesa" },
  { id: "AIRTEL_MONEY", label: "Airtel Money", hint: "Pay with Airtel" },
  { id: "MIXX_BY_YAS", label: "Mixx by Yas", hint: "Yas money" },
  { id: "HALOPESA", label: "HaloPesa", hint: "Halo mobile money" },
];

interface PackageInfo {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  durationSeconds: number;
}

type Step = "method" | "phone" | "processing" | "success" | "failed";

function PortalPayPage() {
  const router = useRouter();
  const params = useSearchParams();
  const packageId = params.get("package") || "";
  const redirect = params.get("redirect") || "";

  const [pkg, setPkg] = useState<PackageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<Step>("method");
  const [paymentId, setPaymentId] = useState("");
  const [providerTx, setProviderTx] = useState("");

  useEffect(() => {
    if (!packageId) return;
    fetch(`/api/portal/packages?package=${encodeURIComponent(packageId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.package) setPkg(j.data.package);
        else setError("Package not found.");
      })
      .catch(() => setError("Could not load package."))
      .finally(() => setLoading(false));
  }, [packageId]);

  async function initiate() {
    if (!method || !phone) return;
    setError("");
    setStep("processing");
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          phoneNumber: phone,
          paymentMethod: method,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not start payment.");
        setStep("method");
        return;
      }
      setPaymentId(json.data?.id || "");
      setProviderTx(json.data?.providerTransactionId || "");
      setStep("processing");
    } catch {
      setError("Could not start payment.");
      setStep("method");
    }
  }

  async function checkPayment() {
    if (!paymentId) return;
    setError("");
    try {
      const res = await fetch(`/api/payments/${paymentId}`);
      const json = await res.json();
      const status = json.data?.status;
      if (status === "SUCCESS") {
        // Fulfil (authoritative) via webhook-confirm and show voucher
        const confirmRes = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId }),
        });
        const confirm = await confirmRes.json();
        if (confirmRes.ok && confirm.data?.voucherCode) {
          setStep("success");
          router.replace(
            `/portal/success?voucher=${encodeURIComponent(confirm.data.voucherCode)}&redirect=${encodeURIComponent(redirect)}`
          );
        } else {
          setError("Payment confirmed but voucher could not be created. Contact support.");
        }
      } else if (status === "FAILED" || status === "CANCELLED" || status === "EXPIRED") {
        setStep("failed");
      } else {
        setError("Payment still pending. Please confirm you have paid and try again.");
      }
    } catch {
      setError("Could not verify payment. Please retry.");
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-slate-500">Loading…</div>;
  }

  if (error && !pkg) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <div className="text-slate-600">{error}</div>
        <Link href="/portal" className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-white">
          Back to packages
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Package summary */}
      {pkg && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">You selected</div>
          <div className="text-lg font-semibold text-slate-900">{pkg.name}</div>
          <div className="mt-1 text-2xl font-bold text-brand-600">
            {new Intl.NumberFormat("en-TZ", {
              style: "currency",
              currency: pkg.currency,
              minimumFractionDigits: 0,
            }).format(pkg.price)}
          </div>
        </div>
      )}

      {step === "method" && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold text-slate-900">How do you want to pay?</h2>
          <p className="text-sm text-slate-500">Choose your mobile money.</p>
          <div className="mt-3 space-y-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMethod(m.id);
                  setStep("phone");
                }}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-brand-400"
              >
                <div>
                  <div className="font-semibold text-slate-900">{m.label}</div>
                  <div className="text-xs text-slate-500">{m.hint}</div>
                </div>
                <span className="text-slate-300">›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "phone" && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold text-slate-900">Your phone number</h2>
          <p className="text-sm text-slate-500">
            Paying with {method ? METHOD_MAP[method] : ""}. We will send your voucher by SMS.
          </p>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XXXXXXXX"
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-lg focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={initiate}
            disabled={phone.replace(/\D/g, "").length < 9}
            className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Continue to payment
          </button>
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </div>
      )}

      {step === "processing" && (
        <div className="mt-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-2xl">
              💳
            </div>
            <h2 className="mt-3 text-lg font-semibold text-slate-900">
              Complete your {method ? METHOD_MAP[method] : ""} payment
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Amount:{" "}
              <strong>
                {pkg &&
                  new Intl.NumberFormat("en-TZ", { style: "currency", currency: pkg.currency, minimumFractionDigits: 0 }).format(pkg.price)}
              </strong>
            </p>
            <p className="mt-3 text-sm text-slate-600">
              Follow the prompts on your phone to approve the payment. Once done,{" "}
              <strong>tap “I have paid”</strong>.
            </p>
            <button
              onClick={checkPayment}
              className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
            >
              I have paid
            </button>
            {providerTx && (
              <div className="mt-2 text-xs text-slate-400">Ref: {providerTx}</div>
            )}
            {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
          </div>
        </div>
      )}

      {step === "failed" && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <div className="text-3xl">✖</div>
          <h2 className="mt-2 text-lg font-semibold text-red-800">Payment not completed</h2>
          <p className="mt-1 text-sm text-red-700">Your payment could not be confirmed. Please try again.</p>
          <button
            onClick={() => setStep("method")}
            className="mt-4 w-full rounded-xl bg-white px-4 py-3 font-semibold text-red-700 border border-red-200"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

const METHOD_MAP: Record<PayMethod, string> = {
  MPESA: "M-Pesa",
  AIRTEL_MONEY: "Airtel Money",
  MIXX_BY_YAS: "Mixx by Yas",
  HALOPESA: "HaloPesa",
};

export default function PayPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-slate-500">Loading…</div>}>
      <PortalPayPage />
    </Suspense>
  );
}
