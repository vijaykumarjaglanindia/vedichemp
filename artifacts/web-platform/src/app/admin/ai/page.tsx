/**
 * VEDIC HEMP — AI INTELLIGENCE (admin)
 *
 * Fraud signals, listing-risk moderation and seller-verification posture in
 * one place. Every panel is a SUGGESTION queue: the AI ranks, a human acts,
 * and the act itself goes through the same reason-gated, audited actions as
 * everything else. The AI can flag a listing; it can never unpublish one.
 *
 * The listing-risk queue is LIVE — it is drawn from the real catalogue: any
 * listing that earned a claims-strike (someone tried to save medical-claims
 * copy on it) is surfaced here, barred from advertising until compliance
 * clears the strike (A1). The strike itself is the deterministic block; the
 * AI only ranks and explains. The fraud panel below is an illustrative sample
 * of the signal types the engine watches for.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BrainCircuit, ShieldAlert, FileWarning, UserCheck, ShieldCheck } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, EmptyState } from "@/components/ui";
import { aiProviderName, listingRiskQueue } from "@/lib/ai";
import { readCatalog } from "@/lib/catalog";

export const metadata: Metadata = { title: "AI Intelligence · Admin" };
export const dynamic = "force-dynamic";

/**
 * The patterns a fraud engine would watch for. None of them is wired to a
 * detector yet, so this is a list of TYPES, not a queue of cases: there is no
 * account id, no score and no action button, because there is nothing to act
 * on. It becomes a queue the day a detector writes real rows.
 */
const FRAUD_SIGNAL_TYPES = [
  { signal: "Payment-decline velocity", detail: "Repeated failed prepaid attempts across cards on one device." },
  { signal: "Return-abuse pattern", detail: "Repeated not-as-described claims on high-value regulated items." },
  { signal: "Review velocity anomaly", detail: "A burst of ratings on a new listing from very new accounts." },
  { signal: "Address churn", detail: "One device, many delivery addresses in a short window." },
];

export default async function AdminAiPage() {
  const products = await readCatalog();
  const risks = listingRiskQueue(products);

  return (
    <Shell active="/admin/analytics" breadcrumb={["Admin", "AI Intelligence"]} title="AI Intelligence">
      <div className="vh-row" style={{ gap: 8, marginBottom: "var(--sp-3)" }}>
        <BrainCircuit size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} />
        <p className="small muted" style={{ margin: 0 }}>
          Engine: <strong>{aiProviderName()}</strong> · The AI ranks and explains; humans decide. Every action taken
          from these queues is reason-gated and lands in the <Link href="/admin/audit">audit trail</Link>.
        </p>
      </div>

      <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><FileWarning size={16} strokeWidth={2.2} aria-hidden /> Listing moderation — claims-strike queue</span>}
          action={<StatusPill tone={risks.length ? "danger" : "ok"}>{risks.length} flagged</StatusPill>}
          pad0
        >
          {risks.length === 0 ? (
            <div style={{ padding: 16 }}>
              <EmptyState icon="🛡️" headline="No listings under a claims-strike" sub="When a seller attempts medical-claims copy on a listing, it is flagged here and barred from advertising until compliance clears it." />
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="vh-table">
                <thead><tr><th>Listing</th><th>Seller</th><th>AI finding</th><th>State</th><th></th></tr></thead>
                <tbody>
                  {risks.map((l) => (
                    <tr key={l.id}>
                      <td className="small" style={{ fontWeight: 700 }}>{l.listing}</td>
                      <td className="small">{l.seller}</td>
                      <td className="small muted">{l.finding}</td>
                      <td><StatusPill tone="danger">Claims strike</StatusPill></td>
                      <td style={{ textAlign: "right" }}>
                        <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/catalogue/products/${l.id}`}>Review &amp; clear</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="small muted" style={{ margin: 0, padding: "10px 16px 14px" }}>
            The strike is the deterministic block — it is set by the same copy-check that runs on every listing save,
            regardless of what the AI thinks. Clearing it is an audited admin act with a ≥20-char reason.
          </p>
        </Card>

        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><ShieldAlert size={16} strokeWidth={2.2} aria-hidden /> Fraud signals</span>}
          action={<span className="small muted">illustrative sample</span>}
          pad0
        >
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead><tr><th>Signal</th><th>What it looks like</th><th>Open cases</th></tr></thead>
              <tbody>
                {FRAUD_SIGNAL_TYPES.map((f) => (
                  <tr key={f.signal}>
                    <td className="small" style={{ fontWeight: 700 }}>{f.signal}</td>
                    <td className="small muted">{f.detail}</td>
                    <td><StatusPill tone="neutral">none — detector not wired</StatusPill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><UserCheck size={16} strokeWidth={2.2} aria-hidden /> What the AI can and cannot do</span>}>
          <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
            <li>It CAN rank listings by claims-risk — but the strike above is the deterministic copy-check that runs on every save regardless, and only a human clears it.</li>
            <li>It CAN flag fraud patterns — suspending a user still requires a human with a 20-character reason, logged.</li>
            <li>It CANNOT approve a CoA, advertise anything, move money or read health data. Those paths simply don&rsquo;t exist for it.</li>
          </ul>
          <p className="small muted vh-row" style={{ gap: 6, marginTop: 12, marginBottom: 0 }}>
            <ShieldCheck size={14} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-ok)" }} />
            No health data reaches this surface — the queues rank listings and behaviour signals, never a buyer&rsquo;s clinical record.
          </p>
        </Card>
      </div>
    </Shell>
  );
}
