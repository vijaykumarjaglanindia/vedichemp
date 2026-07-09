/**
 * VEDIC HEMP — SELLER MANAGEMENT (§3.3)
 *
 * KYC queue + the seller register. Approve/Reject/Suspend are maker–checker
 * (A6). Drug-licence verification for CBD/MED_CANNABIS classes needs a
 * registry lookup AND a pharmacist sign-off — a registry outage must not
 * block the queue indefinitely, but it also cannot forge an approval
 * ("fail closed on compliance gates"). Commission-plan changes carry a
 * mandatory 30-day notice before they take effect (A5).
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus, MoneyText, ComplianceBadge, Banner, DataTable, type Column } from "@/components/ui";
import { SELLERS, type SampleSeller } from "@/lib/sample";

export const metadata: Metadata = { title: "Sellers · Admin" };

const KYC_QUEUE = SELLERS.filter((s) => s.kycState === "KYC_PENDING");

const columns: Column<SampleSeller>[] = [
  { key: "name", header: "Seller", render: (s) => (
      <div>
        <div style={{ fontWeight: 600 }}>{s.name}</div>
        <div className="small muted mono">{s.gstin}</div>
      </div>
    ) },
  { key: "state", header: "State", render: (s) => <StatusPill tone={toneForStatus(s.state)}>{s.state.replace(/_/g, " ")}</StatusPill> },
  { key: "health", header: "Health score", render: (s) => (
      <span className="tabular" style={{ color: s.healthScore < 65 ? "var(--vh-warn)" : "var(--vh-ok)" }}>
        {s.healthScore}/100
      </span>
    ) },
  { key: "classes", header: "Classes", render: (s) => (
      <div className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
        {s.classes.map((c) => <ComplianceBadge key={c} cls={c} />)}
      </div>
    ) },
  { key: "gmv", header: "GMV (lifetime)", align: "right", render: (s) => <MoneyText paise={s.gmvPaise} /> },
  { key: "actions", header: "Actions", render: (s) => (
      <div className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
        <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/sellers#${s.id}-commission`}>Commission plan</a>
        {s.state !== "SUSPENDED" ? (
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/sellers#${s.id}-suspend`}>Suspend</a>
        ) : (
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/sellers#${s.id}-reinstate`}>Reinstate</a>
        )}
      </div>
    ) },
];

export default function AdminSellersPage() {
  return (
    <Shell active="/admin/sellers" breadcrumb={["Admin", "Sellers"]} title="Seller management">
      <div className="vh-grid" style={{ gap: 18 }}>
        <Card title="KYC queue" action={<StatusPill tone={KYC_QUEUE.length ? "warn" : "ok"}>{KYC_QUEUE.length} pending</StatusPill>}>
          {KYC_QUEUE.length === 0 ? (
            <p className="small muted">Nothing pending.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {KYC_QUEUE.map((s) => (
                <li key={s.id} className="vh-row-between" style={{ borderBottom: "1px solid var(--vh-line)", paddingBottom: 10 }}>
                  <span>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div className="small muted mono">{s.gstin} · {s.classes.join(", ")}</div>
                  </span>
                  <span className="vh-row" style={{ gap: 8 }}>
                    <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/sellers#${s.id}-registry`}>Registry lookup</a>
                    <a className="vh-btn vh-btn-sm vh-btn-primary" href={`/admin/sellers#${s.id}-approve`}>Approve (maker)</a>
                    <a className="vh-btn vh-btn-sm vh-btn-danger" href={`/admin/sellers#${s.id}-reject`}>Reject</a>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Banner severity="info" title="Licence verification">
          For CBD Wellness and Medical Cannabis classes, KYC approval requires (1) an automated lookup against the
          state drug-licence registry and (2) a named pharmacist sign-off recorded against the licence number. If the
          registry is unreachable, the queue item stays pending rather than auto-approving — a registry outage must
          not manufacture an approval, but it also must not block a patient's own prescription elsewhere in the
          platform (fail closed on compliance, fail open on convenience).
        </Banner>

        <Card title="All sellers" pad0>
          <DataTable columns={columns} rows={SELLERS} />
        </Card>

        <div className="vh-grid cols-2">
          <Card title="Approve / reject / suspend">
            <p className="small muted" style={{ marginTop: 0 }}>
              Approval and suspension are maker–checker: the reviewing admin (maker) submits a decision with a reason
              code, and a second, different admin (checker) confirms before it takes effect. A suspension effective
              immediately locks new listings and pauses payouts; existing orders still ship (buyers are never
              collateral).
            </p>
          </Card>
          <Card title="Commission plan changes (A5)">
            <p className="small muted" style={{ marginTop: 0 }}>
              Assigning or changing a seller&apos;s commission plan is maker–checker AND time-gated: the database
              constraint <code>CHECK (effectiveFrom &gt;= noticeSentAt + interval &apos;30 days&apos;)</code> rejects
              any schedule that would take effect before 30 days&apos; notice has been given. There is no override —
              a retroactive fee increase cannot be scheduled here even by two admins agreeing to it.
            </p>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
