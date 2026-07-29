"use client";

/**
 * VEDIC HEMP — PSP HOSTED-CHECKOUT LAUNCHER (client island)
 *
 * Loads the configured provider's official script and opens its hosted
 * checkout. Only PUBLISHABLE values ever reach this component (key id, order
 * id, payment session id) — secrets stay server-side, and payment truth stays
 * with the signed webhook: whatever the widget reports, the order is CAPTURED
 * only when the PSP's server tells ours.
 */

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
    Cashfree?: (opts: { mode?: string }) => { checkout: (opts: Record<string, unknown>) => void };
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("script"));
    document.body.appendChild(s);
  });
}

export function PayLauncher({ provider, checkout, amountPaise, reference }: {
  provider: string;
  checkout: Record<string, string>;
  amountPaise: number;
  reference: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function launch() {
    setBusy(true); setError(null);
    try {
      if (provider === "razorpay") {
        await loadScript("https://checkout.razorpay.com/v1/checkout.js");
        if (!window.Razorpay) throw new Error("razorpay");
        new window.Razorpay({
          key: checkout.key,
          order_id: checkout.orderId,
          amount: amountPaise,
          currency: checkout.currency ?? "INR",
          name: "Vedic Hemp",
          notes: { orderId: reference },
          // The widget's callback only NAVIGATES — the signed webhook is what
          // marks the order paid server-side.
          handler: () => { window.location.href = "/checkout/confirmed"; },
        }).open();
      } else if (provider === "cashfree") {
        await loadScript("https://sdk.cashfree.com/js/v3/cashfree.js");
        if (!window.Cashfree) throw new Error("cashfree");
        window.Cashfree({ mode: "production" }).checkout({
          paymentSessionId: checkout.paymentSessionId,
          redirectTarget: "_self",
          returnUrl: `${window.location.origin}/checkout/confirmed`,
        });
      } else {
        // Stripe needs its Elements mount with the publishable key — that last
        // step ships with your Stripe onboarding. The order stays PENDING and
        // safe (nothing ships unpaid) until then.
        setError("This payment provider needs one more setup step (publishable key). Your order is saved — payment can be completed once it's configured.");
      }
    } catch {
      setError("Couldn't reach the payment provider. Your order is saved as payment-pending — try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
      <button type="button" className="vh-btn vh-btn-primary" onClick={launch} disabled={busy} style={{ minWidth: 220 }}>
        {busy ? <Loader2 size={15} aria-hidden className="imp-spin" /> : <CreditCard size={15} aria-hidden />} Pay securely
      </button>
      {error && <p className="small" role="alert" style={{ color: "var(--vh-danger)", margin: 0, maxWidth: "42ch" }}>{error}</p>}
    </div>
  );
}
