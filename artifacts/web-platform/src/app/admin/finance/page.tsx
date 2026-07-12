/**
 * VEDIC HEMP — FINANCE (§3.7)
 *
 * Marketplace revenue, seller settlements, refunds, wallets and the
 * statutory GST/TCS/TDS position. The settlement table is where A6 is most
 * visible: an inline approve control that is disabled the moment the viewing
 * admin is the same person who made the settlement. Posted statements are
 * immutable (A3) — there is no "edit posted settlement" route.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Ban, Landmark, Wallet, ReceiptText, CheckCircle2, Circle, CalendarCheck2 } from "lucide-react";
import { Shell } from "../Shell";
import { Card, Stat, StatusPill, toneForStatus, MoneyText, Banner, DataTable, type Column } from "@/components/ui";
import { Columns, Donut } from "@/components/ui/charts";
import { SETTLEMENTS, KPIS, type SettlementRow } from "@/lib/sample";
import { REVENUE_6M, TAX_POSITION, PERIOD_CLOSE_CHECKLIST } from "../_lib/data";
import { initiatePeriodClose } from "../actions";

export const metadata: Metadata = { title: "Finance · Admin" };

const I = { size: 16, strokeWidth: 2.2 } as const;

const CURRENT_ADMIN = "finance.rao"; // signed-in admin, for the self-approval demo

const columns: Column<SettlementRow>[] = [
  { key: "seller", header: "Seller", render: (s) => s.seller },
  { key: "period", header: "Period", render: (s) => s.period },
  { key: "net", header: "Net payable", align: "right", render: (s) => <MoneyText paise={s.netPaise} /> },
  { key: "status", header: "Status", render: (s) => <StatusPill tone={toneForStatus(s.status)}>{s.status.replace(/_/g, " ")}</StatusPill> },
  { key: "maker", header: "Maker", render: (s) => <span className="mono small">{s.maker}</span> },
  { key: "checker", header: "Checker", render: (s) => s.checker ? <span className="mono small">{s.checker}</span> : <span className="muted small">—</span> },
  { key: "action", header: "Approve", render: (s) => {
      if (s.status === "POSTED") return <span className="small muted">Posted — immutable</span>;
      const selfApprove = s.maker === CURRENT_ADMIN;
      return selfApprove ? (
        <span className="small vh-row" style={{ gap: 6, color: "var(--vh-danger)" }}>
          <Ban size={14} strokeWidth={2.2} aria-hidden /> You are the maker — cannot check (403)
        </span>
      ) : (
        <Link className="vh-btn vh-btn-sm vh-btn-primary" href={`/admin/finance#${s.id}-approve`}>Approve as checker</Link>
      );
    } },
];

const totalPending = SETTLEMENTS.filter((s) => s.status === "AWAITING_CHECKER").reduce((sum, s) => sum + s.netPaise, 0);
const totalPosted = SETTLEMENTS.filter((s) => s.status === "POSTED").reduce((sum, s) => sum + s.netPaise, 0);
const taxTotal = TAX_POSITION.gstPaise + TAX_POSITION.tcsPaise + TAX_POSITION.tdsPaise;
const closeDone = PERIOD_CLOSE_CHECKLIST.filter((c) => c.done).length;

const CLOSE_NOTES: Record<string, { sev: "ok" | "danger" | "warn"; title: string; body: string }> = {
  initiated: { sev: "ok", title: "Period close initiated (maker)", body: "A second, different admin must now sign off before the period actually closes (A6)." },
  blocked: { sev: "danger", title: "Close blocked — checklist incomplete", body: "Open checklist items block initiation server-side. The denied attempt is logged with your reason." },
  reason: { sev: "warn", title: "Reason required", body: "Period close is high-impact — it needs at least 20 characters of free-text reason." },
};

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ close?: string }>;
}) {
  const { close } = await searchParams;
  return (
    <Shell active="/admin/finance" breadcrumb={["Admin", "Finance"]} title="Finance">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><Landmark {...I} aria-hidden /> Marketplace revenue</span>}>
          <div className="vh-grid cols-4">
            <Stat label="GMV today" value={<MoneyText paise={KPIS.gmvTodayPaise} />} />
            <Stat label="Settlements awaiting checker" value={<MoneyText paise={totalPending} />} delta={{ dir: "up", text: `${SETTLEMENTS.filter((s) => s.status === "AWAITING_CHECKER").length} runs` }} />
            <Stat label="Posted this period" value={<MoneyText paise={totalPosted} />} />
            <Stat label="Take rate" value="7.4%" />
          </div>
          <div style={{ marginTop: "var(--sp-4)" }}>
            <div className="vh-row-between" style={{ marginBottom: "var(--sp-2)" }}>
              <span className="small muted">Platform revenue (commission + ads), last 6 months</span>
              <span className="small muted tabular">Jul is month-to-date</span>
            </div>
            <Columns values={REVENUE_6M.valuesPaise} labels={REVENUE_6M.labels} height={120} />
          </div>
        </Card>

        <Card title="Seller settlements" action={<span className="small muted">Maker ≠ checker · both human · service accounts barred (A6)</span>} pad0>
          <DataTable columns={columns} rows={SETTLEMENTS} />
        </Card>

        <Banner severity="ok" title="Immutable once posted (A3)">
          A posted settlement statement cannot be edited or deleted — the database role backing this table has
          <code> DELETE</code> and <code>UPDATE</code> revoked. A correction after posting is a new, linked
          settlement row referencing the original, never an edit to it.
        </Banner>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Wallet {...I} aria-hidden /> Refunds & wallets</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>
              Buyer wallet credits/debits and refund payouts share the same maker–checker threshold as order refunds
              (₹5,000). Wallet balances are never adjusted by direct SQL from this console — every entry is a
              <code> WalletEntry</code> row with a maker, and a checker once the cumulative threshold is crossed.
            </p>
            <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/orders">Go to refunds →</Link>
          </Card>

          <Card title={<span className="vh-row" style={{ gap: 8 }}><ReceiptText {...I} aria-hidden /> GST / TCS / TDS</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>
              Statutory withholding is computed server-side per order line at checkout time and is never re-derived
              in this console — the numbers below are what was actually withheld, not a recomputation.
            </p>
            <div className="vh-row" style={{ gap: "var(--sp-4)", alignItems: "center", flexWrap: "wrap" }}>
              <Donut
                size={112}
                centre="mix"
                segments={[
                  { value: TAX_POSITION.gstPaise, color: "var(--vh-accent)", label: "GST" },
                  { value: TAX_POSITION.tcsPaise, color: "var(--vh-ok)", label: "TCS" },
                  { value: TAX_POSITION.tdsPaise, color: "var(--vh-warn)", label: "TDS" },
                ]}
              />
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8, flex: 1, minWidth: 180 }}>
                <li className="vh-row-between small">
                  <span className="vh-row" style={{ gap: 6 }}>
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: "var(--vh-accent)" }} />
                    GST collected
                  </span>
                  <MoneyText paise={TAX_POSITION.gstPaise} />
                </li>
                <li className="vh-row-between small">
                  <span className="vh-row" style={{ gap: 6 }}>
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: "var(--vh-ok)" }} />
                    TCS withheld
                  </span>
                  <MoneyText paise={TAX_POSITION.tcsPaise} />
                </li>
                <li className="vh-row-between small">
                  <span className="vh-row" style={{ gap: 6 }}>
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: "var(--vh-warn)" }} />
                    TDS withheld
                  </span>
                  <MoneyText paise={TAX_POSITION.tdsPaise} />
                </li>
                <li className="vh-row-between small" style={{ borderTop: "1px solid var(--vh-line)", paddingTop: 8 }}>
                  <span className="muted">Total withheld</span>
                  <MoneyText paise={taxTotal} />
                </li>
              </ul>
            </div>
          </Card>
        </div>

        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><CalendarCheck2 {...I} aria-hidden /> Period close</span>}
          action={<StatusPill tone={closeDone === PERIOD_CLOSE_CHECKLIST.length ? "ok" : "warn"}>{closeDone}/{PERIOD_CLOSE_CHECKLIST.length} complete</StatusPill>}
        >
          <p className="small muted" style={{ marginTop: 0 }}>
            Closing a settlement period locks every posted statement in it against further linkage and generates the
            statutory filing bundle. Period close itself is a maker–checker action, and — like a posted settlement —
            a closed period cannot be reopened; a correction is a new period.
          </p>
          <ul style={{ listStyle: "none", margin: "0 0 var(--sp-2)", padding: 0, display: "grid", gap: 8 }}>
            {PERIOD_CLOSE_CHECKLIST.map((c) => (
              <li key={c.label} className="vh-row small" style={{ gap: 8 }}>
                {c.done
                  ? <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-ok)", flexShrink: 0 }} />
                  : <Circle size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-line)", flexShrink: 0 }} />}
                <span style={{ color: c.done ? undefined : "var(--vh-ink)" }}>
                  {c.label} {c.done ? <span className="muted">— done</span> : <span className="muted">— pending</span>}
                </span>
              </li>
            ))}
          </ul>
          <div id="close-period" style={{ scrollMarginTop: 90 }}>
            {close && CLOSE_NOTES[close] && (
              <div style={{ marginBottom: 12 }}>
                <Banner severity={CLOSE_NOTES[close].sev} title={CLOSE_NOTES[close].title}>{CLOSE_NOTES[close].body}</Banner>
              </div>
            )}
            <form action={initiatePeriodClose} className="vh-grid" style={{ gap: 10, maxWidth: 520 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="close-reason">Reason <span className="req">*</span></label>
                <textarea className="vh-textarea" id="close-reason" name="reason" rows={2} minLength={20} maxLength={500} required placeholder="Why is this period being closed now? (min 20 characters)" />
              </div>
              <button type="submit" className="vh-btn vh-btn-sm vh-btn-ghost" style={{ justifySelf: "start" }}>Initiate period close (maker)</button>
            </form>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
