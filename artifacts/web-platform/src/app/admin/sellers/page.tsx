/**
 * VEDIC HEMP — SELLER MANAGEMENT (§3.3)
 *
 * The seller register, read from the live verification records and what each
 * store has actually sold. The decisions themselves live in one place —
 * /admin/verification — so this page can never hold a second, divergent
 * roster. Drug-licence verification for CBD/MED_CANNABIS classes needs a
 * registry lookup AND a pharmacist sign-off — a registry outage must not
 * block the queue indefinitely, but it also cannot forge an approval
 * ("fail closed on compliance gates"). Commission-plan changes carry a
 * mandatory 30-day notice before they take effect (A5).
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck, Ban, RotateCcw, SearchCheck, Percent, Store, UsersRound, CalendarClock,
} from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, MoneyText, ComplianceBadge, Banner, EmptyState, DataTable, type Column } from "@/components/ui";
import { readStoreCopy } from "@/lib/engage";
import { allKyc, pendingKyc, licenceExpired, statusLabel, type KycStatus, type VendorKyc } from "@/lib/vendor";
import { earningLines } from "@/lib/earnings";
import { adminSaveStorefront } from "../actions";

export const metadata: Metadata = { title: "Sellers · Admin" };
export const dynamic = "force-dynamic";

const I = { size: 16, strokeWidth: 2.2 } as const;
const IB = { size: 14, strokeWidth: 2.2 } as const;

const TONE: Record<KycStatus, "ok" | "warn" | "danger" | "neutral"> = {
  NOT_STARTED: "neutral", SUBMITTED: "warn", APPROVED: "ok", MORE_INFO: "warn", REJECTED: "danger", SUSPENDED: "danger",
};

/** A store's register row: its verification record plus what it has actually
 *  sold. Both come from the live stores — nothing here is kept on this page. */
type SellerRow = VendorKyc & { gmvPaise: number };

const columns: Column<SellerRow>[] = [
  { key: "name", header: "Seller", render: (s) => (
      <div>
        <div style={{ fontWeight: 600 }}>{s.store}</div>
        <div className="small muted mono">{s.gstin}</div>
      </div>
    ) },
  { key: "state", header: "Verification", render: (s) => (
      <span className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
        <StatusPill tone={TONE[s.status]}>{statusLabel(s.status)}</StatusPill>
        {licenceExpired(s) && <StatusPill tone="danger">Licence expired</StatusPill>}
      </span>
    ) },
  { key: "where", header: "Registered", render: (s) => <span className="small">{s.city}, {s.state}</span> },
  { key: "classes", header: "Classes", render: (s) => (
      <div className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
        {s.classes.map((c) => <ComplianceBadge key={c} cls={c} />)}
      </div>
    ) },
  { key: "gmv", header: "GMV (delivered)", align: "right", render: (s) => <MoneyText paise={s.gmvPaise} /> },
  { key: "actions", header: "Actions", render: (s) => (
      <div className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
        <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/finance/commissions">
          <Percent {...IB} aria-hidden /> Commission plan
        </Link>
        <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/verification">
          {s.status === "APPROVED" ? <><Ban {...IB} aria-hidden /> Pause verification</> : <><RotateCcw {...IB} aria-hidden /> Review verification</>}
        </Link>
      </div>
    ) },
];

export default async function AdminSellersPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store } = await searchParams;
  const storeCopy = await readStoreCopy();
  const queue = await pendingKyc();
  const register: SellerRow[] = await Promise.all(
    (await allKyc()).map(async (r) => ({
      ...r,
      gmvPaise: (await earningLines(r.store)).reduce((n, l) => n + l.grossPaise, 0),
    })),
  );
  return (
    <Shell active="/admin/sellers" breadcrumb={["Admin", "Sellers"]} title="Seller management">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        {store === "saved" && (
          <Banner severity="ok" title="Storefront copy published on the seller's behalf">
            Live on the public storefront immediately; the edit is audited as an on-behalf-of action.
          </Banner>
        )}
        {store && store !== "saved" && (
          <Banner severity="danger" title="Storefront copy rejected">
            {store === "claims"
              ? "Claims language rejected (cure/treat/prevent/heal) — the attempt was logged. Storefront copy follows the same rules as everything public."
              : store === "tagline"
                ? "Tagline should be 10–90 characters."
                : "Story should be 40–500 characters."}
          </Banner>
        )}
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><BadgeCheck {...I} aria-hidden /> KYC queue</span>}
          action={<StatusPill tone={queue.length ? "warn" : "ok"}>{queue.length} pending</StatusPill>}
        >
          {queue.length === 0 ? (
            <p className="small muted" style={{ margin: 0 }}>
              Nothing pending — no store is waiting on a verification decision.{" "}
              <Link href="/admin/verification">Open the verification queue →</Link>
            </p>
          ) : (
            <div className="vh-grid" style={{ gap: "var(--sp-2)" }}>
              {queue.map((r) => (
                <div key={r.store} className="vh-card" style={{ padding: "var(--sp-3)" }}>
                  <div className="vh-row-between" style={{ flexWrap: "wrap", gap: 8 }}>
                    <span>
                      <div className="vh-row" style={{ gap: 8 }}>
                        <Store {...I} aria-hidden />
                        <span style={{ fontWeight: 600 }}>{r.store}</span>
                        {r.submittedAt && <span className="small muted">submitted {r.submittedAt}</span>}
                      </div>
                      <div className="small muted mono" style={{ marginTop: 4 }}>
                        {r.gstin} · {r.classes.join(", ")}
                        {r.drugLicenceNo ? ` · licence ${r.drugLicenceNo} (exp ${r.drugLicenceExpiry})` : ""}
                      </div>
                    </span>
                    <span className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <Link className="vh-btn vh-btn-sm vh-btn-primary" href="/admin/verification">
                        <SearchCheck {...IB} aria-hidden /> Review &amp; decide
                      </Link>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Banner severity="info" title="Licence verification">
          For CBD Wellness and Medical Cannabis classes, KYC approval requires (1) an automated lookup against the
          state drug-licence registry and (2) a named pharmacist sign-off recorded against the licence number. If the
          registry is unreachable, the queue item stays pending rather than auto-approving — a registry outage must
          not manufacture an approval, but it also must not block a buyer&apos;s own prescription elsewhere in the
          platform (fail closed on compliance, fail open on convenience).
        </Banner>

        <Card title="All sellers" action={<Link className="small" href="/admin/verification">Verification queue →</Link>} pad0>
          <DataTable
            columns={columns}
            rows={register}
            empty={<EmptyState icon="🏪" headline="No stores registered yet" sub="A storefront appears here once it submits its business details for verification." />}
          />
        </Card>

        {/* ── Storefront copy on the seller's behalf ────────── */}
        <div id="storefront-obo">
          <Card
            title={<span className="vh-row" style={{ gap: 8 }}><Store {...I} aria-hidden /> Storefront copy — on behalf of Vedic Botanicals</span>}
            action={<Link className="small" href="/store/vedic-botanicals" style={{ fontWeight: 700 }}>View public storefront →</Link>}
          >
            <p className="small muted" style={{ marginTop: 0 }}>
              For sellers who ask support to update their page. Same length rules and claims copy-check as
              Seller Central; the save is audited naming the storefront it was done for.
            </p>
            <form action={adminSaveStorefront} className="vh-grid" style={{ gap: 12 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="obo-tagline">Tagline (10–90 chars) <span className="req">*</span></label>
                <input className="vh-input" id="obo-tagline" name="tagline" type="text" maxLength={90}
                  defaultValue={storeCopy?.tagline ?? "AYUSH-licensed CBD wellness, batch-tested since 2021"} />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="obo-story">Store story (40–500 chars) <span className="req">*</span></label>
                <textarea className="vh-textarea" id="obo-story" name="story" rows={3} maxLength={500}
                  defaultValue={storeCopy?.story ?? ""} placeholder="Who they are, how they make it, what buyers can check — no health claims." />
              </div>
              <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit" style={{ justifySelf: "start" }}>
                Publish on seller&apos;s behalf
              </button>
            </form>
          </Card>
        </div>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><UsersRound {...I} aria-hidden /> Approve / reject / suspend</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>
              Approval and suspension are maker–checker: the reviewing admin (maker) submits a decision with a reason
              code, and a second, different admin (checker) confirms before it takes effect. A suspension effective
              immediately locks new listings and pauses payouts; existing orders still ship (buyers are never
              collateral).
            </p>
            <StatusPill tone="info">Maker ≠ checker — 403 on self-approval</StatusPill>
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><CalendarClock {...I} aria-hidden /> Commission plan changes</span>}>
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
