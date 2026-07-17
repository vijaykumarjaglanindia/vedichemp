/**
 * VEDIC HEMP — NOTIFICATION OUTBOX (ops, §6)
 *
 * Every outbound notification across buyer / seller / admin audiences, so ops
 * can see what the platform is telling people. The point of this surface is the
 * §6 guarantee it makes visible: no health data ever rides out in a push title,
 * body or email subject. Every message here has already passed the health-data
 * guard at the notify() boundary; the banner shows how many clinical terms that
 * guard has redacted (0 in normal operation).
 *
 * Recipient identifiers are masked (§4 — the console never renders a full buyer
 * email); the message content shown is the already-sanitised text.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Send, ShieldCheck } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, Banner, EmptyState } from "@/components/ui";
import { allNotifications, s6RedactionCount, type Audience } from "@/lib/notify";
import { maskEmails } from "@/lib/s6";

export const metadata: Metadata = { title: "Outbox · Admin" };
export const dynamic = "force-dynamic";

/** Mask a buyer email (§4 — never a full identifier); store names / "admin"
 *  are not personal identifiers and render as-is. */
function maskRecipient(audience: Audience, recipient: string): string {
  return audience === "buyer" ? maskEmails(recipient) : recipient;
}

const TONE: Record<Audience, "info" | "ok" | "warn"> = { buyer: "info", seller: "ok", admin: "warn" };

export default async function AdminOutboxPage({ searchParams }: { searchParams: Promise<{ audience?: string }> }) {
  const { audience } = await searchParams;
  const all = await allNotifications(300);
  const filtered = audience && ["buyer", "seller", "admin"].includes(audience)
    ? all.filter((n) => n.audience === audience)
    : all;
  const redactions = await s6RedactionCount();
  const counts = {
    all: all.length,
    buyer: all.filter((n) => n.audience === "buyer").length,
    seller: all.filter((n) => n.audience === "seller").length,
    admin: all.filter((n) => n.audience === "admin").length,
  };

  const tabs: { key: string; label: string; n: number }[] = [
    { key: "", label: "All", n: counts.all },
    { key: "buyer", label: "Buyers", n: counts.buyer },
    { key: "seller", label: "Sellers", n: counts.seller },
    { key: "admin", label: "Admins", n: counts.admin },
  ];

  return (
    <Shell active="/admin/outbox" breadcrumb={["Admin", "Outbox"]} title="Notification outbox">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Banner severity={redactions === 0 ? "ok" : "warn"} title="§6 health-data guard" icon="🛡️">
          The primary §6 guarantee is that notifications only ever send templated, health-data-free copy — no
          message interpolates a prescription note, diagnosis or clinical free text. A best-effort deny-list guard
          at the send boundary is the backstop.{" "}
          {redactions === 0
            ? "No clinical terms matched the guard in the current stream — review the full stream below to confirm."
            : `${redactions} clinical term${redactions === 1 ? "" : "s"} were redacted before sending — investigate the emitter(s) flagged §6 below.`}
        </Banner>

        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><Send size={16} strokeWidth={2.2} aria-hidden /> Outbound notifications</span>}
          action={<StatusPill tone="info">{filtered.length} shown</StatusPill>}
          pad0
        >
          <div style={{ overflowX: "auto", padding: "12px 16px 0" }}>
            <nav className="vh-seg" aria-label="Audience filter">
              {tabs.map((t) => (
                <Link
                  key={t.key || "all"}
                  href={t.key ? `/admin/outbox?audience=${t.key}` : "/admin/outbox"}
                  className={(audience ?? "") === t.key ? "on" : undefined}
                  aria-current={(audience ?? "") === t.key ? "true" : undefined}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {t.label} <span className="tabular muted">({t.n})</span>
                </Link>
              ))}
            </nav>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: 16 }}>
              <EmptyState icon="📭" headline="No notifications yet" sub="Buyer, seller and admin notifications appear here as the platform sends them." />
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="vh-table">
                <thead>
                  <tr><th>When</th><th>To</th><th>Kind</th><th>Title</th><th>Body</th><th>§6</th></tr>
                </thead>
                <tbody>
                  {filtered.map((n) => (
                    <tr key={n.id}>
                      <td className="small tabular">{n.createdAt.slice(0, 16).replace("T", " ")}</td>
                      <td className="small"><StatusPill tone={TONE[n.audience]}>{n.audience}</StatusPill> <span className="mono">{maskRecipient(n.audience, n.recipient)}</span></td>
                      <td className="small mono">{n.kind}</td>
                      <td className="small" style={{ fontWeight: 600 }}>{n.title}</td>
                      <td className="small muted" style={{ maxWidth: 340 }}>{maskEmails(n.body)}</td>
                      <td className="small">{n.s6Redacted ? <StatusPill tone="danger">redacted</StatusPill> : <ShieldCheck size={14} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-ok)" }} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
}
