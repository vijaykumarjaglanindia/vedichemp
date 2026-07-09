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
import { Shell } from "../Shell";
import { Card, Stat, StatusPill, toneForStatus, MoneyText, Banner, DataTable, type Column } from "@/components/ui";
import { SETTLEMENTS, KPIS, type SettlementRow } from "@/lib/sample";

export const metadata: Metadata = { title: "Finance · Admin" };

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
        <span className="small" style={{ color: "var(--vh-danger)" }}>🚫 You are the maker — cannot check</span>
      ) : (
        <a className="vh-btn vh-btn-sm vh-btn-primary" href={`/admin/finance#${s.id}-approve`}>Approve as checker</a>
      );
    } },
];

const totalPending = SETTLEMENTS.filter((s) => s.status === "AWAITING_CHECKER").reduce((sum, s) => sum + s.netPaise, 0);
const totalPosted = SETTLEMENTS.filter((s) => s.status === "POSTED").reduce((sum, s) => sum + s.netPaise, 0);

export default function AdminFinancePage() {
  return (
    <Shell active="/admin/finance" breadcrumb={["Admin", "Finance"]} title="Finance">
      <div className="vh-grid" style={{ gap: 18 }}>
        <Card title="Marketplace revenue">
          <div className="vh-grid cols-4">
            <Stat label="GMV today" value={<MoneyText paise={KPIS.gmvTodayPaise} />} />
            <Stat label="Settlements awaiting checker" value={<MoneyText paise={totalPending} />} delta={{ dir: "up", text: `${SETTLEMENTS.filter((s) => s.status === "AWAITING_CHECKER").length} runs` }} />
            <Stat label="Posted this period" value={<MoneyText paise={totalPosted} />} />
            <Stat label="Take rate" value="7.4%" />
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
          <Card title="Refunds & wallets">
            <p className="small muted" style={{ marginTop: 0 }}>
              Buyer wallet credits/debits and refund payouts share the same maker–checker threshold as order refunds
              (₹5,000). Wallet balances are never adjusted by direct SQL from this console — every entry is a
              <code> WalletEntry</code> row with a maker, and a checker once the cumulative threshold is crossed.
            </p>
            <a className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/orders">Go to refunds →</a>
          </Card>
          <Card title="GST / TCS / TDS">
            <p className="small muted" style={{ marginTop: 0 }}>
              Statutory withholding is computed server-side per order line at checkout time and is never re-derived
              in this console — the numbers below are what was actually withheld, not a recomputation.
            </p>
            <div className="vh-grid cols-3">
              <Stat label="GST collected" value={<MoneyText paise={2_84_20_000} />} />
              <Stat label="TCS withheld" value={<MoneyText paise={18_60_000} />} />
              <Stat label="TDS withheld" value={<MoneyText paise={9_30_000} />} />
            </div>
          </Card>
        </div>

        <Card title="Period close">
          <p className="small muted" style={{ marginTop: 0 }}>
            Closing a settlement period locks every posted statement in it against further linkage and generates the
            statutory filing bundle. Period close itself is a maker–checker action, and — like a posted settlement —
            a closed period cannot be reopened; a correction is a new period.
          </p>
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href="#close-period">Initiate period close (maker)</a>
        </Card>
      </div>
    </Shell>
  );
}
