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
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus, MoneyText, ComplianceBadge, Banner, DataTable, type Column } from "@/components/ui";
import { PRODUCTS, COMPLIANCE_QUEUE, type SampleProduct } from "@/lib/sample";

export const metadata: Metadata = { title: "Catalogue · Admin" };

const COA_QUEUE = COMPLIANCE_QUEUE.filter((q) => q.kind === "CoA Review");
const APPROVAL_QUEUE = PRODUCTS.filter((p) => p.state !== "LIVE");

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
  { key: "lab", header: "Lab status", render: (p) =>
      p.labVerified ? <StatusPill tone="ok">CoA approved</StatusPill> : <StatusPill tone="neutral">Not regulated</StatusPill> },
  { key: "state", header: "Listing", render: (p) => <StatusPill tone={toneForStatus(p.state)}>{p.state}</StatusPill> },
];

export default function AdminCataloguePage() {
  return (
    <Shell active="/admin/catalogue" breadcrumb={["Admin", "Catalogue"]} title="Catalogue administration">
      <div className="vh-grid" style={{ gap: 18 }}>
        <Card title="CoA verification queue (A2)" action={<StatusPill tone={COA_QUEUE.length ? "warn" : "ok"}>{COA_QUEUE.length} pending</StatusPill>}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Each row is one batch's lab report. Approving here requires a human pharmacist or compliance reviewer;
            the reviewer checks the batch code on the certificate matches the batch code on the listing, and that
            Δ9-THC is <strong>≤ 0.3%</strong> — both re-checked server-side by <code>assertBatchSellable()</code>
            regardless of what this screen shows.
          </p>
          {COA_QUEUE.length === 0 ? (
            <p className="small muted">Queue is empty.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {COA_QUEUE.map((q) => (
                <li key={q.id} className="vh-row-between" style={{ borderBottom: "1px solid var(--vh-line)", paddingBottom: 10 }}>
                  <span>
                    <div style={{ fontWeight: 600 }}>{q.subject}</div>
                    <div className="small muted">SLA {q.sla} · age {q.ageHours}h · Δ9-THC limit ≤ 0.3%</div>
                  </span>
                  <span className="vh-row" style={{ gap: 8 }}>
                    <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/catalogue#${q.id}-report`}>View report</a>
                    <a className="vh-btn vh-btn-sm vh-btn-primary" href={`/admin/catalogue#${q.id}-approve`}>Approve this batch</a>
                    <a className="vh-btn vh-btn-sm vh-btn-danger" href={`/admin/catalogue#${q.id}-reject`}>Reject</a>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Product approval queue">
          {APPROVAL_QUEUE.length === 0 ? (
            <p className="small muted">No listings awaiting approval.</p>
          ) : (
            <DataTable columns={columns} rows={APPROVAL_QUEUE} />
          )}
        </Card>

        <Card title="Live catalogue" pad0>
          <DataTable columns={columns} rows={PRODUCTS} />
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
