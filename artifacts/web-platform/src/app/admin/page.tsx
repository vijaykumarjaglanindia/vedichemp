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
import Link from "next/link";
import {
  FlaskConical, Stethoscope, Megaphone, ClipboardList, Timer, Ban,
  CheckCircle2, XCircle, AlertTriangle, KeyRound, Siren, ScrollText, Gauge,
} from "lucide-react";
import { Shell } from "./Shell";
import { Card, Stat, StatusPill, MoneyText, EmptyState } from "@/components/ui";
import { Sparkline, Columns } from "@/components/ui/charts";
import { KPIS, COMPLIANCE_QUEUE, SETTLEMENTS, AUDIT } from "@/lib/sample";

// The console chrome shows a live unread-notification badge (request-time
// state), so the admin home must render per request, not at build time.
export const dynamic = "force-dynamic";
import {
  GMV_14D_PAISE, ORDERS_14D, AOV_14D_PAISE, LIVE_SELLERS_14D, DAY_LABELS_14, slaCountdown,
} from "./_lib/data";

export const metadata: Metadata = { title: "Admin Home" };

const I = { size: 16, strokeWidth: 2.2 } as const;

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

const QUEUE_META: Record<string, { icon: React.ReactNode; href: string }> = {
  "CoA Review": { icon: <FlaskConical {...I} aria-hidden />, href: "/admin/catalogue" },
  "Rx Verification": { icon: <Stethoscope {...I} aria-hidden />, href: "/admin/compliance" },
  "Ad Creative Review": { icon: <Megaphone {...I} aria-hidden />, href: "/admin/ads" },
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

/** KPI tile: Stat + a small trend sparkline beneath it. */
function KpiTile({
  label, value, delta, points, spark,
}: {
  label: string; value: React.ReactNode;
  delta?: { dir: "up" | "down"; text: string };
  points: number[]; spark: string;
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <Stat label={label} value={value} delta={delta} />
      <Sparkline points={points} width={150} height={36} label={spark} />
    </div>
  );
}

export default function AdminHomePage() {
  const queueGroups = groupQueue();
  const totalQueueItems = COMPLIANCE_QUEUE.length;

  return (
    <Shell active="/admin" breadcrumb={["Admin"]} title="Marketplace operations">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        {/* KPI row — each stat carries its 14-day trend */}
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><Gauge {...I} aria-hidden /> Marketplace today</span>}
          action={<span className="small muted">14-day trend under each figure</span>}
        >
          <div className="vh-grid cols-4">
            <KpiTile label="GMV today" value={<MoneyText paise={KPIS.gmvTodayPaise} />} delta={{ dir: "up", text: "6.2% vs yesterday" }} points={GMV_14D_PAISE} spark="GMV, last 14 days" />
            <KpiTile label="Orders today" value={KPIS.ordersToday.toLocaleString("en-IN")} delta={{ dir: "up", text: "142 in the last hour" }} points={ORDERS_14D} spark="Orders, last 14 days" />
            <KpiTile label="AOV" value={<MoneyText paise={KPIS.aovPaise} />} points={AOV_14D_PAISE} spark="Average order value, last 14 days" />
            <KpiTile label="Live sellers" value={KPIS.liveSellers.toLocaleString("en-IN")} delta={{ dir: "up", text: "3 approved this week" }} points={LIVE_SELLERS_14D} spark="Live sellers, last 14 days" />
          </div>
        </Card>

        {/* GMV columns */}
        <Card
          title="GMV — last 14 days"
          action={<span className="small muted tabular">peak <MoneyText paise={Math.max(...GMV_14D_PAISE)} /></span>}
        >
          <Columns values={GMV_14D_PAISE} labels={DAY_LABELS_14} height={128} />
          <p className="small muted" style={{ margin: "var(--sp-2) 0 0" }}>
            26 Jun – 9 Jul 2026. Server-computed daily rollup — this chart never re-derives money client-side.
          </p>
        </Card>

        {/* Statutory clocks / SLA */}
        <Card
          title="Statutory clocks"
          action={<span className="small muted">SLA breach escalates to Compliance automatically — no admin has to notice it</span>}
        >
          <div className="vh-grid cols-2">
            <div className="vh-banner vh-banner-warn">
              <Stethoscope {...I} aria-hidden />
              <div>
                <strong>{KPIS.rxPendingSla} prescriptions</strong> pending pharmacist verification within the 4-hour SLA.{" "}
                <Link href="/admin/compliance">Open Rx queue →</Link>
              </div>
            </div>
            <div className="vh-banner vh-banner-info">
              <FlaskConical {...I} aria-hidden />
              <div>
                <strong>{KPIS.coaPendingSla} lab reports</strong> awaiting CoA verification before their batch can go sellable (A2).{" "}
                <Link href="/admin/catalogue">Open CoA queue →</Link>
              </div>
            </div>
          </div>
        </Card>

        {/* Work queues */}
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><ClipboardList {...I} aria-hidden /> Work queues</span>}
          action={<StatusPill tone={totalQueueItems ? "warn" : "ok"}>{totalQueueItems} open</StatusPill>}
        >
          {queueGroups.length === 0 ? (
            <EmptyState icon="✅" headline="Queues are empty" />
          ) : (
            <div className="vh-grid cols-3">
              {queueGroups.map((g) => {
                const meta = QUEUE_META[g.kind];
                return (
                  <div key={g.kind} className="vh-card" style={{ padding: "var(--sp-3)" }}>
                    <div className="vh-row-between" style={{ marginBottom: 8 }}>
                      <span className="vh-row" style={{ gap: 8 }}>
                        {meta?.icon ?? <ClipboardList {...I} aria-hidden />}
                        <strong>{g.kind}</strong>
                      </span>
                      <StatusPill tone="warn">{g.items.length}</StatusPill>
                    </div>
                    <ul style={{ listStyle: "none", margin: "0 0 var(--sp-2)", padding: 0, display: "grid", gap: 8 }}>
                      {g.items.slice(0, 3).map((it) => {
                        const cd = slaCountdown(it.sla, it.ageHours);
                        return (
                          <li key={it.id} className="vh-row-between" style={{ gap: 8 }}>
                            <span className="small muted" style={{ minWidth: 0 }}>{it.subject}</span>
                            <StatusPill tone={cd.tone}>
                              <Timer size={12} strokeWidth={2.2} aria-hidden /> {cd.label}
                            </StatusPill>
                          </li>
                        );
                      })}
                    </ul>
                    <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={meta?.href ?? "/admin/compliance"}>
                      Claim next →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Maker–checker inbox (A6) */}
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><ScrollText {...I} aria-hidden /> Maker–checker inbox</span>}
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
                      <Link href={a.href}>{a.subject}</Link>
                    </td>
                    <td style={{ textAlign: "right" }}>{a.amount != null ? <MoneyText paise={a.amount} /> : <span className="muted">—</span>}</td>
                    <td className="mono small">{a.maker}</td>
                    <td>
                      {selfCheck ? (
                        <span className="small vh-row" style={{ gap: 6, color: "var(--vh-danger)" }} title="You are the maker of this action">
                          <Ban size={14} strokeWidth={2.2} aria-hidden />
                          You made this — cannot check your own (403 if attempted)
                        </span>
                      ) : (
                        <Link className="vh-btn vh-btn-sm vh-btn-primary" href={a.href}>
                          Review as checker
                        </Link>
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
          <Card title={<span className="vh-row" style={{ gap: 8 }}><KeyRound {...I} aria-hidden /> Just-in-time elevation</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>
              Standing privilege is a liability. Sensitive scopes (Rx viewer, settlement checker, recall closer) are
              granted for a bounded window and re-verified against the token on every call, not cached in a session
              cookie.
            </p>
            <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
              <StatusPill tone="neutral">No elevated scope active</StatusPill>
              <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/settings">Request elevation →</Link>
            </div>
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Siren {...I} aria-hidden /> Break-glass access</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>
              Emergency access to a sensitive record (e.g. a prescription during a live adverse-event triage) requires{" "}
              <strong>dual WebAuthn approval</strong> — two distinct passkey holders, neither of whom can be the
              requester. The access is logged before the object key resolves, and the subject is notified regardless
              of urgency (A4).
            </p>
            <Link className="vh-btn vh-btn-sm vh-btn-danger" href="/admin/compliance">Initiate break-glass →</Link>
          </Card>
        </div>

        {/* Live activity + incidents */}
        <div className="vh-grid cols-2">
          <Card title="Live activity" action={<Link className="small" href="/admin/settings">Full audit log →</Link>}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {AUDIT.map((a) => {
                const denied = a.outcome === "DENIED";
                return (
                  <li
                    key={a.id}
                    className="vh-row-between"
                    style={{
                      gap: 8,
                      padding: "8px 8px",
                      borderRadius: 8,
                      borderBottom: "1px solid var(--vh-line)",
                      background: denied ? "color-mix(in srgb, var(--vh-danger) 9%, transparent)" : undefined,
                    }}
                  >
                    <span className="small vh-row" style={{ gap: 8, minWidth: 0 }}>
                      {denied
                        ? <XCircle size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-danger)", flexShrink: 0 }} />
                        : <CheckCircle2 size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-ok)", flexShrink: 0 }} />}
                      <span style={{ fontWeight: denied ? 700 : undefined }}>
                        <span className="mono muted">{a.actor}</span> · {a.action.replace(/_/g, " ")} · {a.entity}
                      </span>
                    </span>
                    <StatusPill tone={a.outcome === "SUCCESS" ? "ok" : denied ? "danger" : "warn"}>{a.outcome}</StatusPill>
                  </li>
                );
              })}
            </ul>
            <p className="small muted" style={{ marginTop: "var(--sp-2)", marginBottom: 0 }}>
              Actor names shown are role-scoped handles, not personal identifiers. Denied attempts are logged too —
              what someone tried is often more informative than what they did.
            </p>
          </Card>

          <Card title="Incidents & alerts">
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              <li className="vh-banner vh-banner-ok">
                <CheckCircle2 {...I} aria-hidden />
                <div>
                  Ad-class violations monitor: <strong>0 leaks</strong> in the last 24h. Every blocked MED_CANNABIS
                  auction candidate logged <code>blocked=true</code> (A1).
                </div>
              </li>
              <li className="vh-banner vh-banner-warn">
                <AlertTriangle {...I} aria-hidden />
                <div>
                  Seller <strong>Ananda Foods</strong> health score dropped to 58 (AT_RISK) — 3 late shipments this
                  week. <Link href="/admin/sellers">Review →</Link>
                </div>
              </li>
              <li className="vh-banner vh-banner-info">
                <Gauge {...I} aria-hidden />
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
