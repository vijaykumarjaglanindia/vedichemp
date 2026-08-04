/**
 * VEDIC HEMP — FINANCE (§2.6)
 *
 * Every figure here is derived from this store's own delivered orders and the
 * settlement runs the marketplace has actually posted — nothing is estimated or
 * seeded. Settlements are posted under maker–checker (A6) and, once posted, are
 * immutable (A3): corrections are new rows referencing the old, never edits.
 * Fee increases require 30 days' notice and are never retroactive (A5) — the
 * notice board below reads the live commission schedule, so a seller sees a
 * change here before it touches a settlement.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { withBase } from "@/lib/base";
import { Download } from "lucide-react";
import { Shell } from "../Shell";
import { Card, Stat, DataTable, StatusPill, toneForStatus, MoneyText, Banner, type Column } from "@/components/ui";
import { Sparkline, Donut } from "@/components/ui/charts";
import { actingStore } from "../_lib/store";
import { runsForSeller, type SettlementRun } from "@/lib/settlements";
import { earningLines, vendorBalance, withdrawalsForSeller, WITHDRAW_TONE, type WithdrawRequest } from "@/lib/earnings";
import { resolveCommission, pendingCommissionChanges } from "@/lib/commissions";
import { sellerReport } from "@/lib/analytics";

export const metadata: Metadata = { title: "Finance" };
export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const store = await actingStore();

  const [runs, balance, withdrawals, lines, rate, pending, report] = await Promise.all([
    runsForSeller(store),
    vendorBalance(store),
    withdrawalsForSeller(store),
    earningLines(store),
    resolveCommission({ SELLER: store }),
    pendingCommissionChanges({ SELLER: store }),
    sellerReport(store, 14),
  ]);

  const settlementColumns: Column<SettlementRun>[] = [
    { key: "period", header: "Period", render: (s) => s.period },
    { key: "gross", header: "Gross", align: "right", render: (s) => <MoneyText paise={s.grossPaise} /> },
    { key: "commission", header: "Commission", align: "right", render: (s) => <MoneyText paise={-s.commissionPaise} /> },
    { key: "net", header: "Net payable", align: "right", render: (s) => <MoneyText paise={s.netPaise} /> },
    { key: "status", header: "Status", render: (s) => <StatusPill tone={toneForStatus(s.status)}>{s.status.replace(/_/g, " ")}</StatusPill> },
    { key: "signoff", header: "Signed off by", render: (s) => <span className="small muted">{s.maker}{s.checker ? ` → ${s.checker}` : " → awaiting checker"}</span> },
    {
      key: "statement", header: "", align: "right", render: (s) =>
        s.status === "POSTED" ? (
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href={withBase(`/api/v1/seller/statements/${s.id}`)} download aria-label={`Download statement for ${s.period}`}>
            <Download size={13} strokeWidth={2.2} aria-hidden />
          </a>
        ) : null,
    },
  ];

  const withdrawColumns: Column<WithdrawRequest>[] = [
    { key: "date", header: "Requested", render: (w) => <span className="tabular">{w.requestedAt.slice(0, 10)}</span> },
    { key: "amount", header: "Amount", align: "right", render: (w) => <MoneyText paise={w.amountPaise} /> },
    { key: "method", header: "To", render: (w) => <span className="small muted">{w.method === "UPI" ? "UPI" : "Bank"} ·&nbsp;<span className="mono">{w.destination}</span></span> },
    { key: "status", header: "Status", render: (w) => <StatusPill tone={WITHDRAW_TONE[w.status]}>{w.status}</StatusPill> },
  ];

  const posted = runs.filter((s) => s.status === "POSTED");
  const totalNetPosted = posted.reduce((sum, s) => sum + s.netPaise, 0);
  const awaiting = runs.filter((s) => s.status === "AWAITING_CHECKER");

  // Earnings so far, straight from the delivered-order lines the settlement
  // runs are themselves built from — gross, what the marketplace kept, what is
  // yours. The only deduction the platform applies is commission; nothing else
  // is invented to fill the chart.
  const grossPaise = lines.reduce((n, l) => n + l.grossPaise, 0);
  const commissionPaise = lines.reduce((n, l) => n + l.commissionPaise, 0);
  const netPaise = grossPaise - commissionPaise;
  const splitSegments = [
    { value: netPaise, color: "var(--vh-accent)", label: "Yours" },
    { value: commissionPaise, color: "var(--vh-saffron)", label: "Marketplace commission" },
  ];

  const spark = report.series.map((d) => d.paise);
  const sparkFirst = spark[0] ?? 0;
  const sparkLast = spark[spark.length - 1] ?? 0;
  const trendDelta = sparkLast === sparkFirst ? undefined : ({ dir: sparkLast > sparkFirst ? "up" : "down", text: sparkLast > sparkFirst ? "trending up" : "trending down" } as const);

  return (
    <Shell active="/seller/finance" breadcrumb={["Seller Central", "Finance"]} title="Finance">
      <div className="vh-grid cols-4" style={{ marginBottom: "var(--sp-4)" }}>
        <Card>
          <Stat label="Settled to you (posted)" value={<MoneyText paise={totalNetPosted} />} delta={trendDelta} />
          <div style={{ marginTop: 8 }}>
            <Sparkline points={spark} width={180} height={40} label="Order value, last 14 days" />
          </div>
        </Card>
        <Card>
          <Stat label="Available to withdraw" value={<MoneyText paise={balance.availablePaise} />} />
          <Link className="small" href="/seller/earnings">Request a payout →</Link>
        </Card>
        <Card><Stat label="Withdrawals in flight" value={<MoneyText paise={balance.pendingPaise} />} /></Card>
        <Card><Stat label="Paid out to date" value={<MoneyText paise={balance.paidPaise} />} /></Card>
      </div>

      <Card
        title="Settlement statements"
        action={
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href={withBase("/seller/finance/statement")} download>
            <Download size={13} strokeWidth={2.2} aria-hidden /> Statement CSV
          </a>
        }
        pad0
      >
        <DataTable
          columns={settlementColumns}
          rows={runs}
          empty={
            <div className="vh-empty">
              No settlements yet. A run is created by the marketplace once you have delivered orders to settle, and
              only becomes payable when a second person posts it.
            </div>
          }
        />
      </Card>
      <p className="small muted" style={{ margin: "8px 0 var(--sp-4)" }}>
        Payouts are posted by us with two-person sign-off — no single person can move money. Once posted,
        a statement is immutable; a correction is a new row that references the old one, never an edit.
        {awaiting.length > 0 && ` ${awaiting.length} run${awaiting.length === 1 ? " is" : "s are"} awaiting a checker.`}
      </p>

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <Card title="Where your order value goes" action={<span className="small muted">{lines.length} delivered order{lines.length === 1 ? "" : "s"}</span>}>
          {grossPaise === 0 ? (
            <p className="small muted" style={{ margin: 0 }}>
              Nothing to split yet — earnings are counted when an order reaches <strong>delivered</strong>. Your
              commission rate is <strong>{rate.ratePct}%</strong>
              {rate.source === "launch-default" ? " (the Early Adopter launch rate)" : ` (set at ${rate.scope.toLowerCase()} level)`}.
            </p>
          ) : (
            <>
              <div className="vh-row" style={{ gap: 24, alignItems: "center", marginBottom: 16 }}>
                <Donut segments={splitSegments} size={128} />
                <div className="vh-grid" style={{ gap: 8, flex: 1 }}>
                  {splitSegments.map((s) => (
                    <div key={s.label} className="vh-row-between small">
                      <span className="vh-row" style={{ gap: 8 }}>
                        <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: s.color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 600 }}>{s.label}</span>
                      </span>
                      <MoneyText paise={s.value} className="small" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="vh-grid" style={{ gap: 6 }}>
                <div className="vh-row-between"><span className="small muted">Gross (your lines, delivered)</span><MoneyText paise={grossPaise} /></div>
                <div className="vh-row-between"><span className="small muted">Commission at {rate.ratePct}%</span><MoneyText paise={-commissionPaise} /></div>
                <div className="vh-row-between" style={{ borderTop: "1px solid var(--vh-line)", paddingTop: 6, fontWeight: 700 }}>
                  <span>Earned</span><MoneyText paise={netPaise} />
                </div>
              </div>
              <p className="small muted" style={{ margin: "10px 0 0" }}>
                Commission is the only deduction the marketplace applies. GST on your sales is collected within
                the buyer&rsquo;s inclusive price and remitted against your GSTIN — it is not taken out here.
              </p>
            </>
          )}
        </Card>

        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card title="Payout requests" pad0>
            <DataTable
              columns={withdrawColumns}
              rows={withdrawals}
              empty={<div className="vh-empty">No payout requests yet.</div>}
            />
          </Card>

          {pending.length === 0 ? (
            <Banner severity="info" title="No fee change scheduled">
              <span className="small">
                Your commission is <strong>{rate.ratePct}%</strong>
                {rate.source === "launch-default" ? " — the Early Adopter launch rate." : `, set at ${rate.scope.toLowerCase()} level.`}
                {" "}An increase can never be applied retroactively, and never sooner than 30 days after we notify
                you — <span className="mono">effectiveFrom &ge; noticeSentAt + 30 days</span> is a database
                constraint, not a policy we remember to follow.
              </span>
            </Banner>
          ) : (
            pending.map((c) => (
              <Banner
                key={`${c.scope}-${c.target}-${c.effectiveFrom}`}
                severity={c.isIncrease ? "warn" : "info"}
                title={c.isIncrease ? `Commission rises to ${c.ratePct}% on ${c.effectiveFrom}` : `Commission falls to ${c.ratePct}% on ${c.effectiveFrom}`}
              >
                <span className="small">
                  Currently {c.currentPct}%, set at {c.scope.toLowerCase()} level. Notice sent {c.noticeSentAt} —
                  that is {c.noticeDays} days&rsquo; notice. Orders delivered before {c.effectiveFrom} settle at the
                  old rate: a fee change never restates a statement that has already been posted.
                </span>
              </Banner>
            ))
          )}
        </div>
      </div>
    </Shell>
  );
}
