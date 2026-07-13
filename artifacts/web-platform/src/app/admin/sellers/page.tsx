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
import Link from "next/link";
import {
  BadgeCheck, Ban, RotateCcw, SearchCheck, Percent, Timer, Store, UsersRound, CalendarClock,
} from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus, MoneyText, ComplianceBadge, Banner, DataTable, type Column } from "@/components/ui";
import { Sparkline } from "@/components/ui/charts";
import { SELLERS, type SampleSeller } from "@/lib/sample";
import { SELLER_HEALTH_SERIES, KYC_META, slaCountdown } from "../_lib/data";

export const metadata: Metadata = { title: "Sellers · Admin" };

const I = { size: 16, strokeWidth: 2.2 } as const;
const IB = { size: 14, strokeWidth: 2.2 } as const;

const KYC_QUEUE = SELLERS.filter((s) => s.kycState === "KYC_PENDING");

const columns: Column<SampleSeller>[] = [
  { key: "name", header: "Seller", render: (s) => (
      <div>
        <div style={{ fontWeight: 600 }}>{s.name}</div>
        <div className="small muted mono">{s.gstin}</div>
      </div>
    ) },
  { key: "state", header: "State", render: (s) => <StatusPill tone={toneForStatus(s.state)}>{s.state.replace(/_/g, " ")}</StatusPill> },
  { key: "health", header: "Health score", render: (s) => {
      const series = SELLER_HEALTH_SERIES[s.id];
      return (
        <div className="vh-row" style={{ gap: 10 }}>
          <span className="tabular" style={{ color: s.healthScore < 65 ? "var(--vh-warn)" : "var(--vh-ok)", minWidth: 52 }}>
            {s.kycState === "KYC_PENDING" ? "—" : `${s.healthScore}/100`}
          </span>
          {series && (
            <Sparkline
              points={series}
              width={70}
              height={22}
              stroke={s.healthScore < 65 ? "var(--vh-warn)" : "var(--vh-ok)"}
              label={`${s.name} health score, last 7 weeks`}
            />
          )}
        </div>
      );
    } },
  { key: "classes", header: "Classes", render: (s) => (
      <div className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
        {s.classes.map((c) => <ComplianceBadge key={c} cls={c} />)}
      </div>
    ) },
  { key: "gmv", header: "GMV (lifetime)", align: "right", render: (s) => <MoneyText paise={s.gmvPaise} /> },
  { key: "actions", header: "Actions", render: (s) => (
      <div className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
        <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/sellers#${s.id}-commission`}>
          <Percent {...IB} aria-hidden /> Commission plan
        </Link>
        {s.state !== "SUSPENDED" ? (
          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/sellers#${s.id}-suspend`}>
            <Ban {...IB} aria-hidden /> Suspend
          </Link>
        ) : (
          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/sellers#${s.id}-reinstate`}>
            <RotateCcw {...IB} aria-hidden /> Reinstate
          </Link>
        )}
      </div>
    ) },
];

export default function AdminSellersPage() {
  return (
    <Shell active="/admin/sellers" breadcrumb={["Admin", "Sellers"]} title="Seller management">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><BadgeCheck {...I} aria-hidden /> KYC queue</span>}
          action={<StatusPill tone={KYC_QUEUE.length ? "warn" : "ok"}>{KYC_QUEUE.length} pending</StatusPill>}
        >
          {KYC_QUEUE.length === 0 ? (
            <p className="small muted">Nothing pending.</p>
          ) : (
            <div className="vh-grid" style={{ gap: "var(--sp-2)" }}>
              {KYC_QUEUE.map((s) => {
                const meta = KYC_META[s.id] ?? { sla: "24h", ageHours: 0 };
                const cd = slaCountdown(meta.sla, meta.ageHours);
                return (
                  <div key={s.id} className="vh-card" style={{ padding: "var(--sp-3)" }}>
                    <div className="vh-row-between" style={{ flexWrap: "wrap", gap: 8 }}>
                      <span>
                        <div className="vh-row" style={{ gap: 8 }}>
                          <Store {...I} aria-hidden />
                          <span style={{ fontWeight: 600 }}>{s.name}</span>
                          <StatusPill tone={cd.tone}>
                            <Timer size={12} strokeWidth={2.2} aria-hidden /> {cd.label}
                          </StatusPill>
                        </div>
                        <div className="small muted mono" style={{ marginTop: 4 }}>
                          {s.gstin} · {s.classes.join(", ")} · in queue {meta.ageHours}h of {meta.sla} SLA
                        </div>
                      </span>
                      <span className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/sellers#${s.id}-registry`}>
                          <SearchCheck {...IB} aria-hidden /> Registry lookup
                        </Link>
                        <Link className="vh-btn vh-btn-sm vh-btn-primary" href={`/admin/sellers#${s.id}-approve`}>Approve (maker)</Link>
                        <Link className="vh-btn vh-btn-sm vh-btn-danger" href={`/admin/sellers#${s.id}-reject`}>Reject</Link>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Banner severity="info" title="Licence verification">
          For CBD Wellness and Medical Cannabis classes, KYC approval requires (1) an automated lookup against the
          state drug-licence registry and (2) a named pharmacist sign-off recorded against the licence number. If the
          registry is unreachable, the queue item stays pending rather than auto-approving — a registry outage must
          not manufacture an approval, but it also must not block a patient&apos;s own prescription elsewhere in the
          platform (fail closed on compliance, fail open on convenience).
        </Banner>

        <Card title="All sellers" pad0>
          <DataTable columns={columns} rows={SELLERS} />
        </Card>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><UsersRound {...I} aria-hidden /> Approve / reject / suspend</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>
              Approval and suspension are maker–checker: the reviewing admin (maker) submits a decision with a reason
              code, and a second, different admin (checker) confirms before it takes effect. A suspension effective
              immediately locks new listings and pauses payouts; existing orders still ship (buyers are never
              collateral).
            </p>
            <StatusPill tone="info">Maker ≠ checker — 403 on self-approval (A6)</StatusPill>
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><CalendarClock {...I} aria-hidden /> Commission plan changes (A5)</span>}>
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
