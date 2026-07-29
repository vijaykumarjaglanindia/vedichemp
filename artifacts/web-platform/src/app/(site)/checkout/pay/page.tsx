/**
 * VEDIC HEMP — COMPLETE PAYMENT (live PSP hosted checkout)
 *
 * Reached only when a real gateway is configured: placeOrder created the order
 * PENDING, opened a PSP order, and handed its checkout payload here via an
 * httpOnly cookie. This page launches the provider's HOSTED checkout (PCI-DSS
 * SAQ-A — card fields belong to the PSP, never to us). The page never decides
 * payment state: the PSP's signed webhook is the only thing that flips the
 * order to CAPTURED, and an unpaid order cannot enter fulfilment.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { MoneyText } from "@/components/ui";
import { PayLauncher } from "./PayLauncher";

export const metadata: Metadata = { title: "Complete payment" };
export const dynamic = "force-dynamic";

interface PayHandoff {
  provider: string;
  reference: string;
  amountPaise: number;
  checkout: Record<string, string>;
}

export default async function PayPage() {
  const jar = await cookies();
  let handoff: PayHandoff | null = null;
  try { handoff = JSON.parse(jar.get("vh-pay")?.value ?? "null") as PayHandoff | null; } catch { handoff = null; }
  // No live handoff (expired cookie, direct visit, sandbox mode) → the order
  // page is the source of truth for payment state.
  if (!handoff) redirect("/checkout/confirmed");

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)", maxWidth: 560 }}>
      <div style={{ textAlign: "center", marginBottom: "var(--sp-4)" }}>
        <ShieldCheck size={40} aria-hidden style={{ color: "var(--vh-accent)", marginBottom: 10 }} />
        <h1 style={{ marginBottom: 6 }}>Complete your payment</h1>
        <p className="muted" style={{ margin: 0 }}>
          Order <b className="mono" style={{ color: "var(--vh-ink)" }}>{handoff!.reference}</b> · amount due{" "}
          <b style={{ color: "var(--vh-ink)" }}><MoneyText paise={handoff!.amountPaise} /></b>
        </p>
      </div>

      <div className="vh-card" style={{ padding: "var(--sp-4)", display: "grid", gap: 14, textAlign: "center" }}>
        <PayLauncher provider={handoff!.provider} checkout={handoff!.checkout} amountPaise={handoff!.amountPaise} reference={handoff!.reference} />
        <p className="small muted" style={{ margin: 0 }}>
          You pay on {handoff!.provider === "razorpay" ? "Razorpay" : handoff!.provider === "cashfree" ? "Cashfree" : "our payment partner"}&rsquo;s
          secure page — card and UPI details never touch Vedic Hemp. Once the payment completes, your order is confirmed
          automatically; the seller can only ship after the payment is confirmed.
        </p>
        <Link href="/checkout/confirmed" className="small">I&rsquo;ve completed payment → view my order</Link>
      </div>
    </div>
  );
}
