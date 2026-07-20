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
import { allRuns, type SettlementRun } from "@/lib/settlements";
import { financeSummary, TCS_RATE_BPS, TDS_RATE_BPS } from "@/lib/finance-summary";
import { createSettlementRun, postSettlementRun } from "../actions";
import { PERIOD_CLOSE_CHECKLIST } from "../_lib/data";
import { initiatePeriodClose } from "../actions";

export const metadata: Metadata = { title: "Finance · Admin" };
export const dynamic = "force-dynamic";

const I = { size: 16, strokeWidth: 2.2 } as const;
const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;

const columns: Column<SettlementRun>[] = [
  { key: "seller", header: "Seller", render: (s) => s.seller },
  { key: "period", header: "Period", render: (s) => s.period },
  { key: "net", header: "Net payable", align: "right", render: (s) => <MoneyText paise={s.netPaise} /> },
  { key: "status", header: "Status", render: (s) => <StatusPill tone={toneForStatus(s.status)}>{s.status.replace(/_/g, " ")}</StatusPill> },
  { key: "maker", header: "Maker", render: (s) => <span className="mono small">{s.maker}</span> },
  { key: "checker", header: "Checker", render: (s) => s.checker ? <span className="mono small">{s.checker}</span> : <span className="muted small">—</span> },
  { key: "action", header: "Post", render: (s) => {
      if (s.status === "POSTED") return <span className="small muted">Posted — immutable</span>;
      // The server decides maker≠checker at post time; this button is decoration.
      return (
        <form action={postSettlementRun} style={{ display: "inline-flex" }}>
          <input type="hidden" name="runId" value={s.id} />
          <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Post as checker</button>
        </form>
      );
    } },
];
const closeDone = PERIOD_CLOSE_CHECKLIST.filter((c) => c.done).length;

const CLOSE_NOTES: Record<string, { sev: "ok" | "danger" | "warn"; title: string; body: string }> = {
  initiated: { sev: "ok", title: "Period close initiated (maker)", body: "A second, different admin must now sign off before the period actually closes (A6)." },
  blocked: { sev: "danger", title: "Close blocked — checklist incomplete", body: "Open checklist items block initiation server-side. The denied attempt is logged with your reason." },
  reason: { sev: "warn", title: "Reason required", body: "Period close is high-impact — it needs at least 20 characters of free-text reason." },
};

const ST_MSG: Record<string, { sev: "ok" | "danger" | "warn"; text: string }> = {
  created: { sev: "ok", text: "Settlement run created (you are its maker). A DIFFERENT admin must post it — you cannot." },
  posted: { sev: "ok", text: "Settlement posted by a second admin. The statement is now immutable (A3) and the seller is notified." },
  makerdenied: { sev: "danger", text: "Blocked — you created this run, so you cannot also post it (A6 maker ≠ checker). The denied attempt is logged." },
  role: { sev: "danger", text: "Blocked — money actions check the roles you actually hold: preparing a run needs ADMIN_FINANCE, posting one needs ADMIN_FINANCE_APPROVER (no account can hold both). Ask an owner to grant the role on Settings → Roles. The denied attempt is logged." },
  pending: { sev: "warn", text: "That seller already has a run awaiting its checker." },
  empty: { sev: "warn", text: "Nothing to settle — no un-settled delivered orders for that seller." },
  state: { sev: "warn", text: "That run was already posted." },
};

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ close?: string; st?: string }>;
}) {
  const { close, st } = await searchParams;
  const runs = await allRuns();
  const fin = await financeSummary();
  const totalPending = runs.filter((s) => s.status === "AWAITING_CHECKER").reduce((sum, s) => sum + s.netPaise, 0);
  const totalPosted = runs.filter((s) => s.status === "POSTED").reduce((sum, s) => sum + s.netPaise, 0);
  const stMsg = st ? ST_MSG[st] : undefined;
  return (
    <Shell
      active="/admin/finance"
      breadcrumb={["Admin", "Finance"]}
      title="Finance"
      actions={<Link href="/admin/finance/withdrawals" className="vh-btn vh-btn-sm vh-btn-primary">Vendor payouts &amp; withdrawals</Link>}
    >
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><Landmark {...I} aria-hidden /> Marketplace revenue</span>}>
          <div className="vh-grid cols-4">
            <Stat label="GMV (orders placed)" value={<MoneyText paise={fin.gmvPaise} />} delta={{ dir: "up", text: `${fin.orderCount} order${fin.orderCount === 1 ? "" : "s"}` }} />
            <Stat label="Settlements awaiting checker" value={<MoneyText paise={totalPending} />} delta={{ dir: "up", text: `${runs.filter((s) => s.status === "AWAITING_CHECKER").length} runs` }} />
            <Stat label="Posted this period" value={<MoneyText paise={totalPosted} />} />
            <Stat label="Take rate" value={fin.takeRateBps > 0 ? pct(fin.takeRateBps) : "—"} />
          </div>
          <div style={{ marginTop: "var(--sp-4)" }}>
            <div className="vh-row-between" style={{ marginBottom: "var(--sp-2)" }}>
              <span className="small muted">Recognised commission revenue by seller (posted settlements)</span>
              <span className="small muted tabular">₹{Math.round(fin.commissionPaise / 100).toLocaleString("en-IN")} total</span>
            </div>
            {fin.revenueBySeller.length > 0 ? (
              <Columns values={fin.revenueBySeller.map((r) => r.commissionPaise)} labels={fin.revenueBySeller.map((r) => r.seller)} height={120} />
            ) : (
              <p className="small muted" style={{ margin: 0 }}>No settlements posted yet — commission revenue is recognised only once a run is posted by its checker.</p>
            )}
          </div>
        </Card>

        <div id="settlements" style={{ scrollMarginTop: 90 }}>
          {stMsg && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity={stMsg.sev}>{stMsg.text}</Banner></div>}
          <Card title="Seller settlements" action={<span className="small muted">Maker ≠ checker · both human · service accounts barred (A6)</span>} pad0>
            <DataTable columns={columns} rows={runs} />
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--vh-line)" }}>
              <form action={createSettlementRun} className="vh-row" style={{ gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div className="vh-field" style={{ minWidth: 220 }}>
                  <label className="vh-label" htmlFor="st-seller">Create a run (you become its maker)</label>
                  <select className="vh-input" id="st-seller" name="seller" defaultValue="Vedic Botanicals">
                    <option value="Vedic Botanicals">Vedic Botanicals</option>
                    <option value="Himalayan Hemp Co.">Himalayan Hemp Co.</option>
                    <option value="Ananda Foods">Ananda Foods</option>
                  </select>
                </div>
                <button className="vh-btn vh-btn-sm" type="submit">Create settlement run</button>
                <span className="small muted">Amounts derive from delivered orders — not typed in.</span>
              </form>
            </div>
          </Card>
        </div>

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
              GST is the tax already included in buyer prices, summed from {fin.orderCount} placed order{fin.orderCount === 1 ? "" : "s"} —
              what was actually collected. TCS (GST §52) and TDS (§194-O) are the marketplace&rsquo;s statutory
              withholding on seller payouts, derived from <MoneyText paise={fin.settledGrossPaise} /> of posted settlements
              at the rates shown.
            </p>
            <div className="vh-row" style={{ gap: "var(--sp-4)", alignItems: "center", flexWrap: "wrap" }}>
              <Donut
                size={112}
                centre="mix"
                segments={[
                  { value: fin.gstCollectedPaise, color: "var(--vh-accent)", label: "GST" },
                  { value: fin.tcsPaise, color: "var(--vh-ok)", label: "TCS" },
                  { value: fin.tdsPaise, color: "var(--vh-warn)", label: "TDS" },
                ]}
              />
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8, flex: 1, minWidth: 180 }}>
                <li className="vh-row-between small">
                  <span className="vh-row" style={{ gap: 6 }}>
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: "var(--vh-accent)" }} />
                    GST collected
                  </span>
                  <MoneyText paise={fin.gstCollectedPaise} />
                </li>
                <li className="vh-row-between small">
                  <span className="vh-row" style={{ gap: 6 }}>
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: "var(--vh-ok)" }} />
                    TCS withheld <span className="muted">@ {pct(TCS_RATE_BPS)}</span>
                  </span>
                  <MoneyText paise={fin.tcsPaise} />
                </li>
                <li className="vh-row-between small">
                  <span className="vh-row" style={{ gap: 6 }}>
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: "var(--vh-warn)" }} />
                    TDS withheld <span className="muted">@ {pct(TDS_RATE_BPS)}</span>
                  </span>
                  <MoneyText paise={fin.tdsPaise} />
                </li>
                <li className="vh-row-between small" style={{ borderTop: "1px solid var(--vh-line)", paddingTop: 8 }}>
                  <span className="muted">GST + TCS + TDS</span>
                  <MoneyText paise={fin.taxTotalPaise} />
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
