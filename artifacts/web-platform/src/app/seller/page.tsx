/**
 * VEDIC HEMP — SELLER HOME (§2.1)
 *
 * Account-health, compliance blockers (A2/A5), performance chart, pending
 * orders, low-stock alerts, settlements due and an ads mini-card.
 * Acknowledging a blocker never resolves it — the publish gate is a
 * server/DB fact, not a checkbox the seller can tick away.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle, FileWarning, Hourglass, PackagePlus, FileUp, Printer, Wallet,
  ArrowRight, CheckCircle2,
} from "lucide-react";
import { Shell } from "./Shell";
import { Card, Stat, ProgressRing, DataTable, StatusPill, MoneyText, type Column } from "@/components/ui";
import { Columns, BarList } from "@/components/ui/charts";
import { getSession } from "@/lib/auth-lite";
import { fulfilOrder } from "./actions";
import { sellerHome, type Blocker } from "@/lib/seller-home";
import type { Order } from "@/lib/orders";
import {
  SELLER, ACCOUNT_HEALTH, LICENCES, daysUntil, ADS_SUMMARY, AD_CAMPAIGNS,
} from "./_lib/data";

export const metadata: Metadata = { title: "Seller Home" };
export const dynamic = "force-dynamic";

const I = { size: 16, strokeWidth: 2.2 } as const;
const PERIODS = ["7d", "30d", "90d"] as const;

const QUICK_ACTIONS = [
  { label: "Add product", href: "/seller/products/new", icon: <PackagePlus {...I} /> },
  { label: "Upload CoA", href: "/seller/products/p8#coa-upload", icon: <FileUp {...I} /> },
  { label: "Print labels", href: "/seller/orders?status=PACKED", icon: <Printer {...I} /> },
  { label: "View payouts", href: "/seller/finance", icon: <Wallet {...I} /> },
];

function BlockerRow({
  icon, severity, title, body, remediation,
}: {
  icon: ReactNode;
  severity: "danger" | "warn" | "info";
  title: string;
  body: string;
  remediation?: { label: string; href: string };
}) {
  const color = severity === "danger" ? "var(--vh-danger)" : severity === "warn" ? "var(--vh-warn)" : "var(--vh-info)";
  const bg = severity === "danger" ? "var(--vh-danger-bg)" : severity === "warn" ? "var(--vh-warn-bg)" : "var(--vh-info-bg)";
  return (
    <div
      className="vh-row"
      role={severity === "danger" ? "alert" : "status"}
      style={{ alignItems: "flex-start", gap: 12, border: "1px solid var(--vh-line)", borderLeft: `3px solid ${color}`, borderRadius: "var(--vh-radius-sm)", padding: "12px 14px", background: `color-mix(in srgb, ${bg} 45%, var(--vh-surface))` }}
    >
      <span aria-hidden style={{ color, marginTop: 2, flexShrink: 0, display: "inline-flex" }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: ".88rem" }}>{title}</div>
        <div className="small muted" style={{ marginTop: 2 }}>{body}</div>
        {remediation && (
          <Link className="small" href={remediation.href} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontWeight: 700 }}>
            {remediation.label} <ArrowRight size={13} strokeWidth={2.4} aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function SellerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const period = PERIODS.includes(rawPeriod as (typeof PERIODS)[number]) ? (rawPeriod as (typeof PERIODS)[number]) : "7d";

  // Live read model — orders, listings (A2 CoA state), settlements from the
  // real stores, scoped to the selected reporting period. Illustrative-only
  // cards (ads) stay seeded and are labelled as such.
  const session = await getSession();
  const today = new Date().toISOString().slice(0, 10);
  const periodDays = period === "30d" ? 30 : period === "90d" ? 90 : 7;
  const home = await sellerHome(session?.email ?? "seller@example.in", today, periodDays);
  const labelStride = Math.max(1, Math.round(home.kpis.series.length / 7));

  const pendingOrders = home.toAccept;
  const lowStock = home.lowStock;
  const settlementDuePaise = home.settlementDuePaise;
  const ayush = LICENCES.find((l) => l.type === "AYUSH");
  const ayushDays = ayush?.validTo ? daysUntil(ayush.validTo) : null;
  const openBlockers = home.blockers.length + (ayushDays !== null && ayushDays <= 30 ? 1 : 0);
  const weekGmvPaise = home.kpis.gmvPaise;

  const coaLabel: Record<string, string> = { NONE: "no lab report uploaded", PENDING_REVIEW: "lab report awaiting compliance review", REJECTED: "lab report rejected" };

  const orderColumns: Column<Order>[] = [
    { key: "reference", header: "Order", render: (o) => <div><div style={{ fontWeight: 600 }}>{o.reference}</div><div className="small muted">{o.placedAt.slice(0, 10)}</div></div> },
    { key: "city", header: "Ship to", render: (o) => o.city || "—" },
    { key: "total", header: "Your share", align: "right", render: (o) => <MoneyText paise={o.items.filter((it) => it.seller === SELLER.name).reduce((n, it) => n + it.linePaise, 0)} /> },
    {
      key: "actions", header: "", align: "right", render: (o) => (
        <span className="vh-row" style={{ gap: 8, justifyContent: "flex-end" }}>
          <form action={fulfilOrder} style={{ display: "inline-flex" }}>
            <input type="hidden" name="reference" value={o.reference} />
            <input type="hidden" name="op" value="accept" />
            <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Accept</button>
          </form>
          <Link className="small" href={`/seller/orders/${o.reference}`}>Details →</Link>
        </span>
      ),
    },
  ];

  return (
    <Shell
      active="/seller"
      breadcrumb={["Seller Central", "Home"]}
      title={`Welcome back, ${SELLER.name}`}
      actions={
        <nav className="vh-seg" aria-label="Reporting period">
          {PERIODS.map((p) => (
            <Link key={p} href={`/seller?period=${p}`} className={p === period ? "on" : undefined} aria-current={p === period ? "true" : undefined}>
              {p}
            </Link>
          ))}
        </nav>
      }
    >
      {/* Quick actions */}
      <div className="vh-row" style={{ gap: 8, marginBottom: "var(--sp-4)", flexWrap: "wrap" }}>
        {QUICK_ACTIONS.map((a, i) => (
          <Link key={a.href} className={`vh-btn vh-btn-sm ${i === 0 ? "vh-btn-primary" : "vh-btn-ghost"}`} href={a.href} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden style={{ display: "inline-flex" }}>{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>

      {/* Marketplace model: the seller owns the listing and the fulfilment */}
      <div className="vh-banner vh-banner-info" role="status" style={{ marginBottom: "var(--sp-4)" }}>
        <span aria-hidden style={{ fontSize: "1.1rem", lineHeight: 1 }}>🤝</span>
        <div>
          <strong style={{ display: "block", marginBottom: 2 }}>Your listings, your responsibility</strong>
          You submitted your licences when you created this account, and you are responsible for
          the genuineness, quality and compliance of every product you list. Orders arrive here
          after the buyer has paid — we forward the details to you; you pack, hand the parcel
          to your delivery partner, and{" "}
          <Link href="/seller/orders">update the status</Link> the buyer tracks. Per your Marketplace
          Agreement, damaged / wrong / expired items are replaced or refunded at your cost.
        </div>
      </div>

      <div className="vh-grid cols-2" style={{ alignItems: "start", marginBottom: "var(--sp-4)" }}>
        {/* Performance — live from the seller's real orders, scoped to `period` */}
        <Card title="Performance" action={<span className="small muted">GMV — your share, last {period}</span>}>
          <div className="vh-row" style={{ gap: 24, alignItems: "baseline", marginBottom: 16 }}>
            <span style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              <MoneyText paise={weekGmvPaise} />
            </span>
            <span className="small muted">across {home.kpis.orders} order{home.kpis.orders === 1 ? "" : "s"} · last {period}</span>
          </div>
          <Columns values={home.kpis.series.map((d) => d.paise)} labels={home.kpis.series.map((d, i) => (i % labelStride === 0 ? d.label : ""))} height={112} />
          <div className="vh-grid cols-4" style={{ marginTop: "var(--sp-4)", paddingTop: "var(--sp-3)", borderTop: "1px solid var(--vh-line)" }}>
            <Stat label={`GMV (${period})`} value={<MoneyText paise={home.kpis.gmvPaise} />} />
            <Stat label="Orders" value={home.kpis.orders} />
            <Stat label="AOV" value={<MoneyText paise={home.kpis.aovPaise} />} />
            <Stat label="To accept" value={pendingOrders.length} />
          </div>
        </Card>

        {/* Account health — the CoA sub-score + standing are LIVE (from the
            real A2 blockers computed above); the other sub-scores are an
            illustrative sample pending real fulfilment/defect analytics. */}
        <Card title="Account health" action={<span className="small muted">CoA sub-score is live</span>}>
          <div className="vh-row" style={{ gap: 20, alignItems: "center", marginBottom: 16 }}>
            <ProgressRing percent={ACCOUNT_HEALTH.score} size={84} />
            <div>
              <div className="vh-row" style={{ gap: 6, fontWeight: 700, fontSize: "1.05rem" }}>
                {home.blockers.length === 0 ? (
                  <><CheckCircle2 size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-ok)" }} /> CoA-compliant</>
                ) : (
                  <><FileWarning size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-danger)" }} /> {home.blockers.length} CoA blocker{home.blockers.length === 1 ? "" : "s"} open</>
                )}
              </div>
              <div className="small muted">CoA compliance is live from your catalogue; fulfilment / defect / policy shown are an illustrative sample.</div>
            </div>
          </div>
          <BarList
            items={ACCOUNT_HEALTH.subScores.map((s) =>
              s.key === "coa"
                ? {
                    label: "CoA compliance (live)",
                    value: home.blockers.length === 0 ? 100 : Math.max(40, 100 - home.blockers.length * 15),
                    display: home.blockers.length === 0 ? "no open blockers" : `${home.blockers.length} regulated listing(s) awaiting an approved CoA`,
                  }
                : { label: `${s.label} (sample)`, value: s.value, display: s.note ? `${s.value} · ${s.note}` : `${s.value}/100` }
            )}
          />
        </Card>
      </div>

      {/* Compliance blockers — acknowledge ≠ resolve */}
      <Card
        title="Compliance blockers"
        action={<StatusPill tone={openBlockers > 0 ? "danger" : "ok"}>{openBlockers} open</StatusPill>}
      >
        <div className="vh-grid" style={{ gap: 8 }}>
          {ayushDays !== null && ayushDays <= 30 && (
            <BlockerRow
              icon={<AlertTriangle {...I} />}
              severity="warn"
              title={`AYUSH licence expires in ${ayushDays} days`}
              body={`Licence ${ayush?.number} lapses ${ayush?.validTo}. CBD Wellness and Ayurveda listings are delisted the moment it expires.`}
              remediation={{ label: "Renew licence", href: "/seller/store#licences" }}
            />
          )}
          {home.blockers.length === 0 && (ayushDays === null || ayushDays > 30) && (
            <div className="small muted vh-row" style={{ gap: 6 }}>
              <CheckCircle2 size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-ok)" }} />
              No open compliance blockers — every regulated listing has an APPROVED, batch-matched CoA.
            </div>
          )}
          {home.blockers.map((b: Blocker) => (
            <BlockerRow
              key={b.productId}
              icon={b.coaState === "PENDING_REVIEW" ? <Hourglass {...I} /> : <FileWarning {...I} />}
              severity={b.coaState === "PENDING_REVIEW" ? "info" : "danger"}
              title={b.coaState === "PENDING_REVIEW" ? `Batch ${b.batchCode} awaiting CoA review` : `CoA required for “${b.title}”`}
              body={`${b.title} — ${coaLabel[b.coaState] ?? "no approved CoA"}. This regulated listing cannot go live without an APPROVED, batch-matched Certificate of Analysis. There is no override.`}
              remediation={b.coaState === "PENDING_REVIEW" ? undefined : { label: "Upload CoA", href: `/seller/products/${b.productId}#coa-upload` }}
            />
          ))}
          <div className="vh-row" style={{ gap: 8, marginTop: 4 }}>
            <button className="vh-btn vh-btn-sm vh-btn-ghost" type="button" disabled title="Acknowledging a blocker does not resolve it">
              Acknowledge
            </button>
            <span className="small muted">Acknowledging does not resolve a blocker — the publish gate only opens when the underlying condition changes.</span>
          </div>
        </div>
      </Card>

      <div style={{ height: "var(--sp-4)" }} />

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <Card title="Orders to accept" action={<Link className="vh-btn vh-btn-sm vh-btn-primary" href="/seller/orders?status=PENDING">Go to orders</Link>} pad0>
          <DataTable columns={orderColumns} rows={pendingOrders} empty={<div className="vh-empty">No orders waiting on you.</div>} />
        </Card>

        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card title="Low-stock alerts" action={<Link className="vh-btn vh-btn-sm vh-btn-primary" href="/seller/inventory">Review inventory</Link>}>
            {lowStock.length === 0 ? (
              <div className="small muted">Every live listing is above its low-stock threshold.</div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                {lowStock.map((w) => (
                  <li key={w.productId} className="vh-row-between">
                    <span>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem" }}><Link href={`/seller/products/${w.productId}`}>{w.title}</Link></div>
                      <div className="small muted">threshold {w.lowStockAt}</div>
                    </span>
                    <StatusPill tone={w.stockQty <= Math.ceil(w.lowStockAt / 2) ? "danger" : "warn"}>{w.stockQty} left</StatusPill>
                  </li>
                ))}
              </ul>
            )}
            <div className="small muted" style={{ marginTop: 8 }}>Stock is the server&rsquo;s authority — a sale decrements it, a restocking return adds it back.</div>
          </Card>

          <div className="vh-grid cols-2">
            <Card title="Settlements due">
              <Stat label="Awaiting posting" value={<MoneyText paise={settlementDuePaise} />} />
              <div className="small muted" style={{ marginTop: 8 }}>Posted only after maker–checker sign-off. Statements are immutable once posted.</div>
              <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/seller/finance" style={{ marginTop: 8, display: "inline-block" }}>View finance →</Link>
            </Card>
            <Card title="Vedic Ads">
              <Stat label="ROAS (7d)" value={`${ADS_SUMMARY.roas7d}x`} delta={{ dir: "up", text: "0.3x vs prior" }} />
              <div className="small muted" style={{ marginTop: 8 }}>{AD_CAMPAIGNS.filter((c) => c.status === "ACTIVE").length} active campaign(s) · ACOS {ADS_SUMMARY.acos7d}%</div>
              <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/seller/ads" style={{ marginTop: 8, display: "inline-block" }}>View Vedic Ads →</Link>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
