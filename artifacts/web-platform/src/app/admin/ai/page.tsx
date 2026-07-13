/**
 * VEDIC HEMP — AI INTELLIGENCE (admin)
 *
 * Fraud signals, listing-risk moderation and seller-verification posture in
 * one place. Every panel is a SUGGESTION queue: the AI ranks, a human acts,
 * and the act itself goes through the same reason-gated, audited actions as
 * everything else. The AI can flag a listing; it can never unpublish one.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BrainCircuit, ShieldAlert, FileWarning, UserCheck } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill } from "@/components/ui";
import { aiProviderName } from "@/lib/ai";

export const metadata: Metadata = { title: "AI Intelligence · Admin" };

const FRAUD_SIGNALS = [
  { id: "u1042", signal: "Payment-decline velocity", detail: "4 failed prepaid attempts across 3 cards in 9 days on one device", score: 86, act: "Review buyer" },
  { id: "u0871", signal: "Return-abuse pattern", detail: "3 'empty box' claims in 60 days, all high-value CBD items", score: 78, act: "Review returns" },
  { id: "s-004", signal: "Review velocity anomaly", detail: "Seller's new listing gained 40 five-star ratings in 48h, 70% from accounts under 30 days old", score: 91, act: "Freeze ratings" },
  { id: "u1580", signal: "Address churn", detail: "Same device, 6 delivery addresses in 3 weeks", score: 64, act: "Step-up verify" },
];

const LISTING_RISK = [
  { listing: "Herbal Sleep Drops 15ml", seller: "Ananda Foods", risk: "Copy implies a sleep OUTCOME ('wake up refreshed, guaranteed')", score: 74 },
  { listing: "CBD Sport Gel 50g", seller: "Vedic Botanicals", risk: "Image text not yet OCR-checked against approved claims copy", score: 58 },
  { listing: "Hemp Protein 500g", seller: "Himalayan Hemp Co.", risk: "None — copy factual, CoA linked, images clean", score: 8 },
];

export default async function AdminAiPage() {
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
        <Card title={<span className="vh-row" style={{ gap: 8 }}><ShieldAlert size={16} strokeWidth={2.2} aria-hidden /> Fraud signals</span>} pad0>
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

        <Card title={<span className="vh-row" style={{ gap: 8 }}><FileWarning size={16} strokeWidth={2.2} aria-hidden /> Listing moderation — copy & image risk</span>} pad0>
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead><tr><th>Listing</th><th>Seller</th><th>AI finding</th><th>Risk</th></tr></thead>
              <tbody>
                {LISTING_RISK.map((l) => (
                  <tr key={l.listing}>
                    <td className="small" style={{ fontWeight: 700 }}>{l.listing}</td>
                    <td className="small">{l.seller}</td>
                    <td className="small muted">{l.risk}</td>
                    <td><StatusPill tone={l.score >= 70 ? "danger" : l.score >= 40 ? "warn" : "ok"}>{l.score}</StatusPill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><UserCheck size={16} strokeWidth={2.2} aria-hidden /> What the AI can and cannot do</span>}>
          <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
            <li>It CAN rank listings by claims-risk — the hard block remains the deterministic copy-check that runs on every save regardless.</li>
            <li>It CAN flag fraud patterns — suspending a user still requires a human with a 20-character reason, logged.</li>
            <li>It CANNOT approve a CoA (A2), advertise anything (A1), move money (A6) or read health data (A4). Those paths simply don&rsquo;t exist for it.</li>
          </ul>
        </Card>
      </div>
    </Shell>
  );
}
