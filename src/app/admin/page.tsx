/**
 * VEDIC HEMP — ADMIN HOME (§3.1)
 *
 * The admin's first screen: marketplace health, statutory clocks, the day's
 * work queues, the maker–checker inbox, and a pseudonymised activity feed.
 * Nothing here is decorative — every card either reflects a server-computed
 * number (sample data standing in for it) or a server guard (A2/A4/A6) that
 * this page merely narrates.
 */

import type { Metadata } from "next";
import { Shell } from "./Shell";
import { Card, Stat, StatusPill, toneForStatus, MoneyText, Banner, EmptyState } from "@/components/ui";
import { KPIS, COMPLIANCE_QUEUE, SETTLEMENTS, AUDIT } from "@/lib/sample";

export const metadata: Metadata = { title: "Admin Home" };

const CURRENT_ADMIN = "seller_ops.khan"; // the signed-in admin, for the "cannot approve your own" demo

// Work queues: COMPLIANCE_QUEUE grouped by kind, with counts.
function groupQueue() {
  const map = new Map<string, typeof COMPLIANCE_QUEUE>();
  for (const item of COMPLIANCE_QUEUE) {
    const bucket = map.get(item.kind) ?? [];
    bucket.push(item);
    map.set(item.kind, bucket);
  }
  return Array.from(map.entries()).map(([kind, items]) => ({ kind, items }));
}

const QUEUE_ICON: Record<string, string> = {
  "CoA Review": "🧪",
  "Rx Verification": "⚕️",
  "Ad Creative Review": "📣",
};

// Maker–checker inbox: pending approvals across the platform. Each row names
// its maker so the UI can demonstrate the "maker cannot check their own
// action" rule (A6) — this is cosmetic; the real gate is assertCheckerPresent()
// on the server, which throws MAKER_IS_CHECKER regardless of what the UI shows.
const PENDING_APPROVALS = [
  ...SETTLEMENTS.filter((s) => s.status === "AWAITING_CHECKER").map((s) => ({
    id: s.id,
    kind: "Settlement",
    subject: `${s.seller} · ${s.period}`,
    amount: s.netPaise,
    maker: s.maker,
    href: "/admin/finance",
  })),
  { id: "sa1", kind: "Seller suspension", subject: "Ananda Foods — KYC lapse", amount: null, maker: "seller_ops.khan", href: "/admin/sellers" },
  { id: "rc1", kind: "Recall close", subject: "CBD Tincture 10ml — batch VB-2401", amount: null, maker: "compliance.nair", href: "/admin/compliance" },
];

export default function AdminHomePage() {
  const queueGroups = groupQueue();
  const totalQueueItems = COMPLIANCE_QUEUE.length;

  return (
    <Shell active="/admin" breadcrumb={["Admin"]} title="Marketplace operations">
      <div className="vh-grid" style={{ gap: 18 }}>
        {/* KPI row */}
        <Card title="Marketplace today">
          <div className="vh-grid cols-4">
            <Stat label="GMV today" value={<MoneyText paise={KPIS.gmvTodayPaise} />} delta={{ dir: "up", text: "6.2% vs yesterday" }} />
            <Stat label="Orders today" value={KPIS.ordersToday.toLocaleString("en-IN")} delta={{ dir: "up", text: "142 in the last hour" }} />
            <Stat label="AOV" value={<MoneyText paise={KPIS.aovPaise} />} />
            <Stat label="Live sellers" value={KPIS.liveSellers.toLocaleString("en-IN")} delta={{ dir: "up", text: "3 approved this week" }} />
          </div>
        </Card>

        {/* Statutory clocks / SLA */}
        <Card
          title="Statutory clocks"
          action={<span className="small muted">SLA breach escalates to Compliance automatically — no admin has to notice it</span>}
        >
          <div className="vh-grid cols-2">
            <div className="vh-banner vh-banner-warn">
              <span aria-hidden>⚕️</span>
              <div>
                <strong>{KPIS.rxPendingSla} prescriptions</strong> pending pharmacist verification within the 4-hour SLA.{" "}
                <a href="/admin/compliance">Open Rx queue →</a>
              </div>
            </div>
            <div className="vh-banner vh-banner-info">
              <span aria-hidden>🧪</span>
              <div>
                <strong>{KPIS.coaPendingSla} lab reports</strong> awaiting CoA verification before their batch can go sellable (A2).{" "}
                <a href="/admin/catalogue">Open CoA queue →</a>
              </div>
            </div>
          </div>
        </Card>

        {/* Work queues */}
        <Card title="Work queues" action={<StatusPill tone={totalQueueItems ? "warn" : "ok"}>{totalQueueItems} open</StatusPill>}>
          {queueGroups.length === 0 ? (
            <EmptyState icon="✅" headline="Queues are empty" />
          ) : (
            <div className="vh-grid cols-3">
              {queueGroups.map((g) => (
                <div key={g.kind} className="vh-card" style={{ padding: 14 }}>
                  <div className="vh-row-between" style={{ marginBottom: 8 }}>
                    <span className="vh-row" style={{ gap: 8 }}>
                      <span aria-hidden style={{ fontSize: "1.2rem" }}>{QUEUE_ICON[g.kind] ?? "📋"}</span>
                      <strong>{g.kind}</strong>
                    </span>
                    <StatusPill tone="warn">{g.items.length}</StatusPill>
                  </div>
                  <ul style={{ listStyle: "none", margin: "0 0 10px", padding: 0, display: "grid", gap: 6 }}>
                    {g.items.slice(0, 3).map((it) => (
                      <li key={it.id} className="small muted">
                        {it.subject} · SLA {it.sla} · age {it.ageHours}h
                      </li>
                    ))}
                  </ul>
                  <a
                    className="vh-btn vh-btn-sm vh-btn-ghost"
                    href={g.kind === "Rx Verification" ? "/admin/compliance" : g.kind === "Ad Creative Review" ? "/admin/ads" : "/admin/catalogue"}
                  >
                    Claim next →
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Maker–checker inbox (A6) */}
        <Card
          title="Maker–checker inbox"
          action={<StatusPill tone={PENDING_APPROVALS.length ? "warn" : "ok"}>{PENDING_APPROVALS.length} pending</StatusPill>}
        >
          <p className="small muted" style={{ marginTop: 0 }}>
            No single admin moves money, suspends a seller or closes a recall alone (A6). Every row below needs a
            second, different human. The checker action is <strong>rejected server-side with a 403</strong> if the
            checker id equals the maker id — this UI mirrors that rule, it does not enforce it.
          </p>
          <table className="vh-table">
            <thead>
              <tr>
                <th>Kind</th>
                <th>Subject</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th>Maker</th>
                <th>Checker action</th>
              </tr>
            </thead>
            <tbody>
              {PENDING_APPROVALS.map((a) => {
                const selfCheck = a.maker === CURRENT_ADMIN;
                return (
                  <tr key={a.id}>
                    <td>{a.kind}</td>
                    <td>
                      <a href={a.href}>{a.subject}</a>
                    </td>
                    <td style={{ textAlign: "right" }}>{a.amount != null ? <MoneyText paise={a.amount} /> : <span className="muted">—</span>}</td>
                    <td className="mono small">{a.maker}</td>
                    <td>
                      {selfCheck ? (
                        <span className="small" style={{ color: "var(--vh-danger)" }} title="You are the maker of this action">
                          🚫 You made this — cannot check your own (403 if attempted)
                        </span>
                      ) : (
                        <a className="vh-btn vh-btn-sm vh-btn-primary" href={a.href}>
                          Review as checker
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* JIT elevation + break-glass */}
        <div className="vh-grid cols-2">
          <Card title="Just-in-time elevation">
            <p className="small muted" style={{ marginTop: 0 }}>
              Standing privilege is a liability. Sensitive scopes (Rx viewer, settlement checker, recall closer) are
              granted for a bounded window and re-verified against the token on every call, not cached in a session
              cookie.
            </p>
            <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
              <StatusPill tone="neutral">No elevated scope active</StatusPill>
              <a className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/settings">Request elevation →</a>
            </div>
          </Card>
          <Card title="Break-glass access">
            <p className="small muted" style={{ marginTop: 0 }}>
              Emergency access to a sensitive record (e.g. a prescription during a live adverse-event triage) requires{" "}
              <strong>dual WebAuthn approval</strong> — two distinct passkey holders, neither of whom can be the
              requester. The access is logged before the object key resolves, and the subject is notified regardless
              of urgency (A4).
            </p>
            <a className="vh-btn vh-btn-sm vh-btn-danger" href="/admin/compliance">Initiate break-glass →</a>
          </Card>
        </div>

        {/* Live activity + incidents */}
        <div className="vh-grid cols-2">
          <Card title="Live activity" action={<a className="small" href="/admin/settings">Full audit log →</a>}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {AUDIT.map((a) => (
                <li key={a.id} className="vh-row-between" style={{ borderBottom: "1px solid var(--vh-line)", paddingBottom: 8 }}>
                  <span className="small">
                    <span className="mono muted">{a.actor}</span> · {a.action.replace(/_/g, " ")} · {a.entity}
                  </span>
                  <StatusPill tone={a.outcome === "SUCCESS" ? "ok" : a.outcome === "DENIED" ? "danger" : "warn"}>{a.outcome}</StatusPill>
                </li>
              ))}
            </ul>
            <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
              Actor names shown are role-scoped handles, not personal identifiers. Denied attempts are logged too —
              what someone tried is often more informative than what they did.
            </p>
          </Card>

          <Card title="Incidents & alerts">
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              <li className="vh-banner vh-banner-ok">
                <span aria-hidden>✅</span>
                <div>
                  Ad-class violations monitor: <strong>0 leaks</strong> in the last 24h. Every blocked MED_CANNABIS
                  auction candidate logged <code>blocked=true</code> (A1).
                </div>
              </li>
              <li className="vh-banner vh-banner-warn">
                <span aria-hidden>⚠️</span>
                <div>
                  Seller <strong>Ananda Foods</strong> health score dropped to 58 (AT_RISK) — 3 late shipments this
                  week. <a href="/admin/sellers">Review →</a>
                </div>
              </li>
              <li className="vh-banner vh-banner-info">
                <span aria-hidden>🧾</span>
                <div>
                  {KPIS.disputesOpen} disputes open · auction fill rate {(KPIS.auctionFillRate * 100).toFixed(0)}%.
                </div>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
