import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help & Support",
};

export default function PortalSupportPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Help &amp; Support</h1>
      <p className="mt-1 text-sm text-slate-500">
        Common answers to get you back online quickly.
      </p>

      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">How do I buy internet?</h2>
          <p className="mt-1 text-sm text-slate-600">
            Choose a package on the home screen, select your mobile money, pay,
            and your voucher is sent by SMS. Enter it to connect.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">I paid but have no voucher</h2>
          <p className="mt-1 text-sm text-slate-600">
            Please wait a few minutes, then check your SMS. If it does not arrive,
            contact our support with your payment reference.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Speed / connection issues</h2>
          <p className="mt-1 text-sm text-slate-600">
            Try toggling Wi-Fi off and on, or forget and reconnect to TZ Connect
            Wi-Fi. Contact support if the issue continues.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-900 p-5 text-white">
        <h2 className="font-semibold">Contact support</h2>
        <p className="mt-1 text-sm text-slate-300">
          Call or WhatsApp: <strong>+255 000 000 000</strong>
        </p>
        <p className="text-sm text-slate-300">
          Email: <strong>support@tzconnect.co.tz</strong>
        </p>
      </div>

      <Link href="/portal" className="mt-6 block rounded-xl border border-slate-200 bg-white px-4 py-3 text-center font-medium text-slate-700">
        Back to home
      </Link>
    </div>
  );
}
