/**
 * VEDIC HEMP — PAYMENT METHODS (admin control panel)
 *
 * The admin decides what checkout offers: enable/disable any method —
 * Cash on Delivery included — edit each method's checkout copy, and pick
 * the payment gateway. The server-side whitelist follows this page, so a
 * disabled method is rejected even if a client forges it.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Shell } from "../../Shell";
import { Banner, Card, StatusPill } from "@/components/ui";
import { GATEWAYS, readGateway, readPaymentMethods } from "@/lib/payments";
import { savePaymentMethods } from "./actions";

export const metadata: Metadata = { title: "Payment methods · Admin" };
export const dynamic = "force-dynamic";

export default async function PaymentsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ pm?: string }>;
}) {
  const { pm } = await searchParams;
  const methods = await readPaymentMethods();
  const gateway = await readGateway();

  return (
    <Shell
      active="/admin/finance"
      breadcrumb={["Admin", "Finance", "Payment methods"]}
      title="Payment methods"
      actions={<Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/finance"><ArrowLeft size={14} aria-hidden /> Finance</Link>}
    >
      <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
        {pm === "saved" && (
          <Banner severity="ok" title="Payment configuration saved">
            Checkout offers exactly these methods from the next request — and the server rejects
            anything not enabled here, whatever a client sends.
          </Banner>
        )}
        {pm === "none" && (
          <Banner severity="danger" title="At least one method must stay enabled">
            A checkout with zero payment methods can't take orders — nothing was saved.
          </Banner>
        )}

        <Card title={<span className="vh-row" style={{ gap: 8 }}><CreditCard size={16} strokeWidth={2.2} aria-hidden /> Methods offered at checkout</span>}>
          <form action={savePaymentMethods} className="vh-grid" style={{ gap: 18 }}>
            {methods.map((m) => (
              <div key={m.key} style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: "12px 14px" }}>
                <label className="vh-row" style={{ gap: 10, cursor: "pointer", marginBottom: 8 }}>
                  <input type="checkbox" name={`on-${m.key}`} defaultChecked={m.enabled} />
                  <span style={{ fontWeight: 800, color: "var(--vh-ink)" }}>{m.label}</span>
                  <StatusPill tone={m.kind === "cod" ? "warn" : "neutral"}>{m.kind === "cod" ? "Pay on delivery" : "Prepaid"}</StatusPill>
                  {m.enabled && <StatusPill tone="ok">Live</StatusPill>}
                </label>
                <div className="vh-grid cols-2" style={{ gap: 10 }}>
                  <div className="vh-field">
                    <label className="vh-label" htmlFor={`lb-${m.key}`}>Checkout label</label>
                    <input className="vh-input" id={`lb-${m.key}`} name={`label-${m.key}`} maxLength={40} defaultValue={m.label} />
                  </div>
                  <div className="vh-field">
                    <label className="vh-label" htmlFor={`sb-${m.key}`}>Checkout description</label>
                    <input className="vh-input" id={`sb-${m.key}`} name={`sub-${m.key}`} maxLength={140} defaultValue={m.sub} />
                  </div>
                </div>
                {m.key === "cod" && (
                  <p className="small muted" style={{ margin: "8px 0 0" }}>
                    Enabling COD does not weaken any gate: age-gated items still require an ID check
                    on handover, and the seller ships only after the platform forwards the order.
                  </p>
                )}
              </div>
            ))}

            <div className="vh-field" style={{ maxWidth: 320 }}>
              <label className="vh-label" htmlFor="pm-gateway">Payment gateway (prepaid processor)</label>
              <select className="vh-select" id="pm-gateway" name="gateway" defaultValue={gateway}>
                {GATEWAYS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <span className="vh-help">The integration seam — set the gateway&rsquo;s API keys in the environment to go live; no code changes.</span>
            </div>

            <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit" style={{ justifySelf: "start" }}>
              Save payment configuration
            </button>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
