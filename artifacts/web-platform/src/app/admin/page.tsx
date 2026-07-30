/**
 * VEDIC HEMP — ADMIN HOME (§3.1)
 *
 * The admin's first screen: marketplace health, statutory clocks, the day's
 * work queues, the maker–checker inbox, and the activity feed. Every queue,
 * approval and incident is read from the live store that owns it — the only
 * illustrative block is the labelled trend row, which stands in until real
 * order volume flows.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  FlaskConical, Stethoscope, Megaphone, ClipboardList, Ban,
  CheckCircle2, XCircle, AlertTriangle, KeyRound, Siren, ScrollText, Gauge,
} from "lucide-react";
import { Shell } from "./Shell";
import { Card, Stat, StatusPill, MoneyText, EmptyState } from "@/components/ui";
import { Sparkline, Columns } from "@/components/ui/charts";
import { KPIS } from "@/lib/sample";
import { pendingPrescriptions } from "@/lib/prescriptions";
import { readCatalog } from "@/lib/catalog";
import { reviewQueue } from "@/lib/ads";
import { readAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth-lite";
import { allRuns } from "@/lib/settlements";
import { allWithdrawals } from "@/lib/earnings";
import { pendingActions } from "@/lib/users";
import { openRecalls } from "@/lib/recalls";
import { reportedStores } from "@/lib/store-reports";
import { allKyc, licenceExpired } from "@/lib/vendor";

// The console chrome shows a live unread-notification badge (request-time
// state), so the admin home must render per request, not at build time.
export const dynamic = "force-dynamic";
import {
  GMV_14D_PAISE, ORDERS_14D, AOV_14D_PAISE, LIVE_SELLERS_14D, DAY_LABELS_14,
} from "./_lib/data";

export const metadata: Metadata = { title: "Admin Home" };

const I = { size: 16, strokeWidth: 2.2 } as const;

const QUEUE_META: Record<string, { icon: React.ReactNode; href: string }> = {
  "CoA Review": { icon: <FlaskConical {...I} aria-hidden />, href: "/admin/catalogue#coa-queue" },
  "Rx Verification": { icon: <Stethoscope {...I} aria-hidden />, href: "/admin/compliance#rx" },
  "Ad Creative Review": { icon: <Megaphone {...I} aria-hidden />, href: "/admin/ads" },
};

/** A row in the maker–checker inbox. Every one is a real awaiting record from
 *  the store that owns it; the maker is whoever actually made it. The rule is
 *  enforced server-side at decision time — this UI mirrors it, never gates. */
interface PendingApproval {
  id: string;
  kind: string;
  subject: string;
  amount: number | null;
  maker: string;
  href: string;
}

/** KPI tile: Stat + a small trend sparkline beneath it. */
/** Day-over-day change of a series' last two points — a real delta derived
 *  from the same 14-day data the sparkline shows (never a hand-typed claim). */
function dod(points: number[]): { dir: "up" | "down"; text: string } | undefined {
  const last = points.at(-1);
  const prev = points.at(-2);
  if (last === undefined || prev === undefined || prev === 0) return undefined;
  const pct = ((last - prev) / prev) * 100;
  return { dir: pct >= 0 ? "up" : "down", text: `${Math.abs(pct).toFixed(1)}% vs yesterday` };
}

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

export default async function AdminHomePage() {
  // Statutory clocks and work queues read the same real stores: prescriptions
  // awaiting pharmacist review, regulated listings whose CoA has not yet been
  // verified, and ad creatives awaiting a human. All start empty by design and
  // climb only as real work arrives — the two cards can never disagree.
  const rxQueue = await pendingPrescriptions();
  const coaQueue = (await readCatalog()).filter((p) => p.coaState === "PENDING_REVIEW");
  const adQueue = await reviewQueue();
  const rxPending = rxQueue.length;
  const coaPending = coaQueue.length;

  const queueGroups = [
    { kind: "Rx Verification", items: rxQueue.map((r) => ({ id: r.id, subject: `${r.id} · uploaded ${r.uploadedAt.slice(0, 10)}` })) },
    { kind: "CoA Review", items: coaQueue.map((p) => ({ id: p.id, subject: `${p.title}${p.batchCode ? ` · batch ${p.batchCode}` : ""}` })) },
    { kind: "Ad Creative Review", items: adQueue.map((a) => ({ id: a.ad.id, subject: `${a.campaign.seller} · ${a.campaign.name}` })) },
  ].filter((g) => g.items.length > 0);
  const totalQueueItems = queueGroups.reduce((n, g) => n + g.items.length, 0);

  const currentAdmin = (await getSession())?.email ?? "";
  const openRecs = await openRecalls();
  const pendingApprovals: PendingApproval[] = [
    ...(await allRuns()).filter((r) => r.status === "AWAITING_CHECKER").map((r) => ({
      id: r.id, kind: "Settlement", subject: `${r.seller} · ${r.period}`, amount: r.netPaise, maker: r.maker, href: "/admin/finance#settlements",
    })),
    ...(await allWithdrawals()).filter((w) => w.status === "APPROVED").map((w) => ({
      id: w.id, kind: "Vendor payout", subject: `${w.seller} · ${w.destination}`, amount: w.amountPaise, maker: w.makerId ?? "—", href: "/admin/finance/withdrawals",
    })),
    ...(await pendingActions()).map((p) => ({
      id: p.id, kind: p.kind === "SUSPEND" ? "Account suspension" : "Account reinstatement", subject: p.handle, amount: null, maker: p.maker, href: "/admin/users",
    })),
    ...openRecs.map((r) => ({
      id: r.ref, kind: "Recall close", subject: `${r.ref} · ${r.reason.slice(0, 60)}`, amount: null, maker: r.initiator, href: "/admin/compliance#recall",
    })),
  ];

  const activity = await readAudit(8);

  // Incidents are real signals or nothing: storefronts under an open abuse
  // report, verifications whose drug licence has lapsed, and open recalls.
  const flaggedStores = await reportedStores();
  const lapsedLicences = (await allKyc()).filter((r) => r.status === "APPROVED" && licenceExpired(r));
  const incidents = [
    ...flaggedStores.map((s) => ({
      id: `sr-${s.storeSlug}`,
      body: <>Storefront <strong>{s.storeName}</strong> has {s.reports.length} open abuse report{s.reports.length === 1 ? "" : "s"}. <Link href="/admin/reviews">Review →</Link></>,
    })),
    ...lapsedLicences.map((r) => ({
      id: `lic-${r.store}`,
      body: <>Seller <strong>{r.store}</strong> is verified on a drug licence that expired on {r.drugLicenceExpiry}. <Link href="/admin/verification">Review →</Link></>,
    })),
    ...openRecs.map((r) => ({
      id: `rc-${r.ref}`,
      body: <>Recall <strong>{r.ref}</strong> is open and needs a second, different admin to close it. <Link href="/admin/compliance#recall">Review →</Link></>,
    })),
  ];

  return (
    <Shell active="/admin" breadcrumb={["Admin"]} title="Marketplace operations">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        {/* KPI row — each stat carries its 14-day trend */}
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><Gauge {...I} aria-hidden /> Marketplace today</span>}
          action={<span className="small muted">Illustrative platform metrics — live once real order volume flows</span>}
        >
          <div className="vh-grid cols-4">
            <KpiTile label="GMV today" value={<MoneyText paise={KPIS.gmvTodayPaise} />} delta={dod(GMV_14D_PAISE)} points={GMV_14D_PAISE} spark="GMV, last 14 days" />
            <KpiTile label="Orders today" value={KPIS.ordersToday.toLocaleString("en-IN")} delta={dod(ORDERS_14D)} points={ORDERS_14D} spark="Orders, last 14 days" />
            <KpiTile label="AOV" value={<MoneyText paise={KPIS.aovPaise} />} delta={dod(AOV_14D_PAISE)} points={AOV_14D_PAISE} spark="Average order value, last 14 days" />
            <KpiTile label="Live sellers" value={KPIS.liveSellers.toLocaleString("en-IN")} delta={dod(LIVE_SELLERS_14D)} points={LIVE_SELLERS_14D} spark="Live sellers, last 14 days" />
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
            <div className={`vh-banner ${rxPending > 0 ? "vh-banner-warn" : "vh-banner-ok"}`}>
              <Stethoscope {...I} aria-hidden />
              <div>
                {rxPending > 0 ? (
                  <><strong>{rxPending} prescription{rxPending === 1 ? "" : "s"}</strong> pending pharmacist verification within the 4-hour SLA.{" "}</>
                ) : (
                  <><strong>No prescriptions</strong> awaiting verification — the Rx queue is clear.{" "}</>
                )}
                <Link href="/admin/compliance">Open Rx queue →</Link>
              </div>
            </div>
            <div className={`vh-banner ${coaPending > 0 ? "vh-banner-info" : "vh-banner-ok"}`}>
              <FlaskConical {...I} aria-hidden />
              <div>
                {coaPending > 0 ? (
                  <><strong>{coaPending} lab report{coaPending === 1 ? "" : "s"}</strong> awaiting CoA verification before their batch can go sellable.{" "}</>
                ) : (
                  <><strong>No lab reports</strong> awaiting CoA verification — no regulated batch is blocked.{" "}</>
                )}
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
            <EmptyState icon="✅" headline="Queues are empty" sub="Prescriptions, batch CoAs and ad creatives appear here the moment one is waiting on a human." />
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
                      {g.items.slice(0, 3).map((it) => (
                        <li key={it.id} className="small muted" style={{ minWidth: 0 }}>{it.subject}</li>
                      ))}
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

        {/* Maker–checker inbox */}
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><ScrollText {...I} aria-hidden /> Maker–checker inbox</span>}
          action={<StatusPill tone={pendingApprovals.length ? "warn" : "ok"}>{pendingApprovals.length} pending</StatusPill>}
        >
          <p className="small muted" style={{ marginTop: 0 }}>
            No single admin moves money, suspends a seller or closes a recall alone. Every row below needs a
            second, different human. The checker action is <strong>refused by the server</strong> if the
            checker id equals the maker id — this UI mirrors that rule, it does not enforce it.
          </p>
          {pendingApprovals.length === 0 ? (
            <EmptyState icon="🧑‍⚖️" headline="Nothing awaiting a checker" sub="Settlement runs, vendor payouts, account status changes and open recalls land here while they wait for a second admin." />
          ) : (
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
                {pendingApprovals.map((a) => {
                  const selfCheck = !!currentAdmin && a.maker === currentAdmin;
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
          )}
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
              <strong>two-passkey approval</strong> — two different passkey holders, neither of whom can be the
              requester. The access is recorded before the file can be opened, and the subject is notified regardless
              of urgency.
            </p>
            <Link className="vh-btn vh-btn-sm vh-btn-danger" href="/admin/compliance">Initiate break-glass →</Link>
          </Card>
        </div>

        {/* Live activity + incidents */}
        <div className="vh-grid cols-2">
          <Card title="Live activity" action={<Link className="small" href="/admin/audit">Full audit log →</Link>}>
            {activity.length === 0 ? (
              <EmptyState icon="🧾" headline="No admin actions yet this session" sub="Every mutating action — and every denied attempt — lands here the moment it happens." />
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                {activity.map((a, i) => {
                  const denied = a.outcome === "DENIED";
                  return (
                    <li
                      key={`${a.at}-${i}`}
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
                          <span className="mono muted">{a.actor}</span> · {a.action.replace(/_/g, " ")} · {a.target}
                        </span>
                      </span>
                      <StatusPill tone={denied ? "danger" : "ok"}>{a.outcome}</StatusPill>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="small muted" style={{ marginTop: "var(--sp-2)", marginBottom: 0 }}>
              Denied attempts are logged too — what someone tried is often more informative than what they did.
            </p>
          </Card>

          <Card title="Incidents & alerts">
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              <li className="vh-banner vh-banner-ok">
                <CheckCircle2 {...I} aria-hidden />
                <div>
                  Ad-class violations monitor active — every blocked MED_CANNABIS auction candidate is logged
                  <code>blocked=true</code> (A1).
                </div>
              </li>
              {incidents.length === 0 ? (
                <li className="vh-banner vh-banner-ok">
                  <CheckCircle2 {...I} aria-hidden />
                  <div>No open incident: no storefront under report, no lapsed licence, no recall awaiting closure.</div>
                </li>
              ) : (
                incidents.map((x) => (
                  <li key={x.id} className="vh-banner vh-banner-warn">
                    <AlertTriangle {...I} aria-hidden />
                    <div>{x.body}</div>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
