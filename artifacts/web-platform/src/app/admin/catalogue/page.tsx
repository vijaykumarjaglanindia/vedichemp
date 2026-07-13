/**
 * VEDIC HEMP — CATALOGUE ADMIN (§3.4)
 *
 * Product approval + the Certificate of Analysis verification queue. A2 is
 * the load-bearing rule on this page: a regulated batch (CBD_WELLNESS,
 * MED_CANNABIS) is not sellable without an APPROVED, batch-matched CoA, and
 * that decision is made by a human pharmacist/compliance reviewer — there is
 * no automatic pass and no bulk action, because "approved" here is a legal
 * assertion about a specific batch, not a UI convenience.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical, FileSearch, Timer, Tags, PackageCheck } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus, MoneyText, ComplianceBadge, Banner, DataTable, type Column } from "@/components/ui";
import { PRODUCTS, COMPLIANCE_QUEUE, type SampleProduct } from "@/lib/sample";
import { COA_DETAILS, PENDING_PRODUCTS, TAXONOMY_CHIPS, slaCountdown } from "../_lib/data";

export const metadata: Metadata = { title: "Catalogue · Admin" };

const I = { size: 16, strokeWidth: 2.2 } as const;
const IB = { size: 14, strokeWidth: 2.2 } as const;

const COA_QUEUE = COMPLIANCE_QUEUE.filter((q) => q.kind === "CoA Review");
const APPROVAL_QUEUE = [...PENDING_PRODUCTS, ...PRODUCTS.filter((p) => p.state !== "LIVE")];

const columns: Column<SampleProduct>[] = [
  { key: "product", header: "Product", render: (p) => (
      <span className="vh-row" style={{ gap: 8 }}>
        <span aria-hidden>{p.emoji}</span>
        <span>{p.title}</span>
      </span>
    ) },
  { key: "class", header: "Class", render: (p) => <ComplianceBadge cls={p.cls} /> },
  { key: "seller", header: "Seller", render: (p) => p.seller },
  { key: "price", header: "Price", align: "right", render: (p) => <MoneyText paise={p.pricePaise} /> },
  { key: "lab", header: "Lab status", render: (p) => {
      if (p.labVerified) return <StatusPill tone="ok">CoA approved</StatusPill>;
      if (p.cls === "CBD_WELLNESS" || p.cls === "MED_CANNABIS") return <StatusPill tone="warn">CoA required (A2)</StatusPill>;
      return <StatusPill tone="neutral">Not regulated</StatusPill>;
    } },
  { key: "state", header: "Listing", render: (p) => <StatusPill tone={toneForStatus(p.state)}>{p.state.replace(/_/g, " ")}</StatusPill> },
];

export default function AdminCataloguePage() {
  return (
    <Shell active="/admin/catalogue" breadcrumb={["Admin", "Catalogue"]} title="Catalogue administration">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><FlaskConical {...I} aria-hidden /> CoA verification queue (A2)</span>}
          action={<StatusPill tone={COA_QUEUE.length ? "warn" : "ok"}>{COA_QUEUE.length} pending</StatusPill>}
        >
          <p className="small muted" style={{ marginTop: 0 }}>
            Each card is one batch&apos;s lab report. Approving here requires a human pharmacist or compliance reviewer;
            the reviewer checks the batch code on the certificate matches the batch code on the listing, and that
            Δ9-THC is <strong>≤ 0.3%</strong> — both re-checked server-side by <code>assertBatchSellable()</code>
            regardless of what this screen shows.
          </p>
          {COA_QUEUE.length === 0 ? (
            <p className="small muted">Queue is empty.</p>
          ) : (
            <div className="vh-grid cols-2">
              {COA_QUEUE.map((q) => {
                const cd = slaCountdown(q.sla, q.ageHours);
                const detail = COA_DETAILS[q.id];
                const product = q.subject.split(" · ")[0] ?? q.subject;
                return (
                  <div key={q.id} className="vh-card" style={{ padding: "var(--sp-3)", display: "grid", gap: "var(--sp-2)" }}>
                    <div className="vh-row-between" style={{ gap: 8 }}>
                      <span className="vh-row" style={{ gap: 8, minWidth: 0 }}>
                        <FlaskConical {...I} aria-hidden />
                        <strong>{product}</strong>
                      </span>
                      <StatusPill tone={cd.tone}>
                        <Timer size={12} strokeWidth={2.2} aria-hidden /> {cd.label}
                      </StatusPill>
                    </div>
                    <dl className="small" style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
                      <dt className="muted">Batch</dt>
                      <dd className="mono" style={{ margin: 0 }}>{detail?.batch ?? "—"}</dd>
                      <dt className="muted">Δ9-THC reported</dt>
                      <dd className="mono" style={{ margin: 0 }}>
                        {detail?.thc ?? "—"} <span className="muted">(limit ≤ 0.3%)</span>
                      </dd>
                      <dt className="muted">Laboratory</dt>
                      <dd style={{ margin: 0 }}>{detail?.lab ?? "—"}</dd>
                      <dt className="muted">In queue</dt>
                      <dd style={{ margin: 0 }}>{q.ageHours}h of {q.sla} SLA</dd>
                    </dl>
                    <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/catalogue#${q.id}-report`}>
                        <FileSearch {...IB} aria-hidden /> View report
                      </Link>
                      <Link className="vh-btn vh-btn-sm vh-btn-primary" href={`/admin/catalogue#${q.id}-approve`}>Approve this batch</Link>
                      <Link className="vh-btn vh-btn-sm vh-btn-danger" href={`/admin/catalogue#${q.id}-reject`}>Reject</Link>
                    </div>
                    <p className="small muted" style={{ margin: 0 }}>
                      Approval requires a human reviewer note (≥20 chars) — there is no one-click or bulk approve.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><PackageCheck {...I} aria-hidden /> Product approval queue</span>}
          action={<StatusPill tone={APPROVAL_QUEUE.length ? "warn" : "ok"}>{APPROVAL_QUEUE.length} awaiting</StatusPill>}
          pad0={APPROVAL_QUEUE.length > 0}
        >
          {APPROVAL_QUEUE.length === 0 ? (
            <p className="small muted">No listings awaiting approval.</p>
          ) : (
            <DataTable columns={columns} rows={APPROVAL_QUEUE} />
          )}
        </Card>

        <Card title="Live catalogue" pad0>
          <DataTable columns={columns} rows={PRODUCTS} />
        </Card>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><Tags {...I} aria-hidden /> Taxonomy</span>}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Categories are editorial; compliance class is not. Moving a product between categories never changes its
            compliance class — that field is immutable after first approval.
          </p>
          <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
            {TAXONOMY_CHIPS.map((t) => <StatusPill key={t} tone="neutral">{t}</StatusPill>)}
          </div>
        </Card>

        <Banner severity="danger" title="Explicitly absent by design">
          These routes do not exist, on purpose, and were considered and rejected during design (CLAUDE.md §7):
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            <li><code>POST /admin/catalogue/force-sellable</code> — a &quot;senior approval&quot; override for the
              CoA gate is a licence to sell an untested cannabinoid product.</li>
            <li><code>POST /admin/catalogue/coa/bulk-approve</code> — CoA approval is a per-batch legal assertion; it
              cannot be batched across products.</li>
            <li><code>PATCH /admin/catalogue/:id/compliance-class</code> — a product cannot be reclassified out of a
              regulated class to dodge the CoA gate.</li>
          </ul>
        </Banner>
      </div>
    </Shell>
  );
}
