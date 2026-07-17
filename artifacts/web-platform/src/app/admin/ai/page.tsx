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

// Illustrative sample of the fraud-signal TYPES the engine watches. Unlike the
// listing-risk queue (live from the catalogue), these are representative
// examples — real detection wires the same suggestion→human-acts pattern.
const FRAUD_SIGNALS = [
  { id: "u1042", signal: "Payment-decline velocity", detail: "4 failed prepaid attempts across 3 cards in 9 days on one device", score: 86, act: "Review buyer" },
  { id: "u0871", signal: "Return-abuse pattern", detail: "3 'empty box' claims in 60 days, all high-value CBD items", score: 78, act: "Review returns" },
  { id: "s-004", signal: "Review velocity anomaly", detail: "Seller's new listing gained 40 five-star ratings in 48h, 70% from accounts under 30 days old", score: 91, act: "Freeze ratings" },
  { id: "u1580", signal: "Address churn", detail: "Same device, 6 delivery addresses in 3 weeks", score: 64, act: "Step-up verify" },
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
                <thead><tr><th>Listing</th><th>Seller</th><th>AI finding</th><th>Risk</th><th></th></tr></thead>
                <tbody>
                  {risks.map((l) => (
                    <tr key={l.id}>
                      <td className="small" style={{ fontWeight: 700 }}>{l.listing}</td>
                      <td className="small">{l.seller}</td>
                      <td className="small muted">{l.finding}</td>
                      <td><StatusPill tone="danger">{l.score}</StatusPill></td>
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
            regardless of what the AI thinks. Clearing it is an audited admin act with a ≥20-char reason (A1).
          </p>
        </Card>

        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><ShieldAlert size={16} strokeWidth={2.2} aria-hidden /> Fraud signals</span>}
          action={<span className="small muted">illustrative sample</span>}
          pad0
        >
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead><tr><th>Account</th><th>Signal</th><th>Detail</th><th>Risk</th><th>Suggested action</th></tr></thead>
              <tbody>
                {FRAUD_SIGNALS.map((f) => (
                  <tr key={f.id}>
                    <td className="mono small">{f.id}</td>
                    <td className="small" style={{ fontWeight: 700 }}>{f.signal}</td>
                    <td className="small muted">{f.detail}</td>
                    <td><StatusPill tone={f.score >= 80 ? "danger" : f.score >= 60 ? "warn" : "neutral"}>{f.score}</StatusPill></td>
                    <td><Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/users">{f.act}</Link></td>
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
            <li>It CANNOT approve a CoA (A2), advertise anything (A1), move money (A6) or read health data (A4). Those paths simply don&rsquo;t exist for it.</li>
          </ul>
          <p className="small muted vh-row" style={{ gap: 6, marginTop: 12, marginBottom: 0 }}>
            <ShieldCheck size={14} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-ok)" }} />
            No health data reaches this surface — the queues rank listings and behaviour signals, never a buyer&rsquo;s clinical record (§6/A4).
          </p>
        </Card>
      </div>
    </Shell>
  );
}
