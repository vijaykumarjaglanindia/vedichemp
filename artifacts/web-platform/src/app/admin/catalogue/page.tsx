/**
 * VEDIC HEMP — CATALOGUE ADMIN (§3.4, working moderation)
 *
 * Three live queues over the catalog store: CoA verification (A2), listing
 * approval, and the live catalogue with takedown/restore. A2 is the
 * load-bearing rule on this page: a regulated batch is not sellable without
 * an APPROVED, batch-matched CoA, that decision is made by a human reviewer
 * with a written note — and the store re-checks the gate on every approve,
 * so this screen cannot wave anything past it. No bulk actions, on purpose.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical, Tags, PackageCheck, ShieldAlert } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus, MoneyText, ComplianceBadge, Banner, DataTable, type Column } from "@/components/ui";
import { readCatalog, REGULATED_CLASSES, type CatalogProduct } from "@/lib/catalog";
import { readCategories } from "@/lib/categories";
import { decideCoaReview, moderateListing, takedownListing } from "../actions";

export const metadata: Metadata = { title: "Catalogue · Admin" };

const I = { size: 16, strokeWidth: 2.2 } as const;

const MOD_MESSAGES: Record<string, { severity: "ok" | "danger" | "warn"; title: string; body: string }> = {
  approved: { severity: "ok", title: "Listing approved — it is LIVE", body: "It appears in the catalogue, search and the sitemap immediately." },
  rejected: { severity: "ok", title: "Listing rejected back to DRAFT", body: "The seller sees your note on the listing." },
  suspended: { severity: "ok", title: "Listing suspended", body: "It is absent from every public surface; the seller sees your reason." },
  restored: { severity: "ok", title: "Listing restored to LIVE", body: "The A2 gate was re-checked before restoring." },
  coa: { severity: "danger", title: "Blocked by the CoA gate (A2)", body: "This regulated listing has no APPROVED, batch-matched CoA. The denied attempt is in the audit trail. Approve the batch CoA first — there is no override." },
  note: { severity: "danger", title: "A written note is required", body: "Rejections, suspensions and CoA decisions need a reviewer note of at least 20 characters. The attempt was logged." },
  state: { severity: "warn", title: "Nothing to do", body: "The listing is no longer in a state where that action applies — the queue below is current." },
};

const COA_MESSAGES: Record<string, { severity: "ok" | "danger" | "warn"; title: string; body: string }> = {
  approved: { severity: "ok", title: "Batch CoA approved", body: "The batch is sellable; the listing can now pass review (A2 gate open for this batch)." },
  rejected: { severity: "ok", title: "Batch CoA rejected", body: "If the listing was LIVE it is now suspended — an unverified batch cannot stay sellable (A2 fails closed)." },
  note: { severity: "danger", title: "A reviewer note is required", body: "CoA decisions are per-batch legal assertions: write what you checked (≥ 20 characters). The attempt was logged." },
  state: { severity: "warn", title: "Nothing pending on that batch", body: "The CoA is no longer PENDING_REVIEW." },
};

export default async function AdminCataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ mod?: string; coa?: string; id?: string }>;
}) {
  const { mod, coa } = await searchParams;
  const catalog = await readCatalog();
  const categories = await readCategories({ includeHidden: true });

  const coaQueue = catalog.filter((p) => p.coaState === "PENDING_REVIEW");
  const approvalQueue = catalog.filter((p) => p.status === "UNDER_REVIEW");
  const liveOrSuspended = catalog.filter((p) => p.status === "LIVE" || p.status === "SUSPENDED");

  const modMsg = mod ? MOD_MESSAGES[mod] : undefined;
  const coaMsg = coa ? COA_MESSAGES[coa] : undefined;

  const liveColumns: Column<CatalogProduct>[] = [
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
        if (p.coaState === "APPROVED") return <StatusPill tone="ok">CoA approved</StatusPill>;
        if (REGULATED_CLASSES.includes(p.cls)) return <StatusPill tone="warn">CoA required (A2)</StatusPill>;
        return <StatusPill tone="neutral">Not regulated</StatusPill>;
      } },
    { key: "state", header: "Listing", render: (p) => <StatusPill tone={toneForStatus(p.status)}>{p.status.replace(/_/g, " ")}</StatusPill> },
    { key: "actions", header: "", align: "right", render: (p) =>
        p.status === "LIVE" ? (
          <details style={{ position: "relative" }}>
            <summary className="vh-btn vh-btn-sm vh-btn-ghost" style={{ listStyle: "none", cursor: "pointer" }}>Take down…</summary>
            <form action={takedownListing} className="vh-card" style={{ position: "absolute", right: 0, zIndex: 5, padding: 12, width: 300, display: "grid", gap: 8, textAlign: "left" }}>
              <input type="hidden" name="productId" value={p.id} />
              <input type="hidden" name="op" value="suspend" />
              <label className="vh-label" htmlFor={`susp-${p.id}`}>Reason the seller will see (≥ 20 chars)</label>
              <textarea className="vh-textarea" id={`susp-${p.id}`} name="note" rows={2} maxLength={300} placeholder="e.g. Label photo does not match the approved CoA batch code." />
              <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Suspend listing</button>
            </form>
          </details>
        ) : (
          <form action={takedownListing} style={{ display: "inline-flex" }}>
            <input type="hidden" name="productId" value={p.id} />
            <input type="hidden" name="op" value="restore" />
            <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Restore</button>
          </form>
        ) },
  ];

  return (
    <Shell
      active="/admin/catalogue"
      breadcrumb={["Admin", "Catalogue"]}
      title="Catalogue administration"
      actions={
        <Link href="/admin/catalogue/products" className="vh-btn vh-btn-sm vh-btn-primary">
          All listings — create &amp; edit for sellers
        </Link>
      }
    >
      {modMsg && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity={modMsg.severity} title={modMsg.title}>{modMsg.body}</Banner>
        </div>
      )}
      {coaMsg && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity={coaMsg.severity} title={coaMsg.title}>{coaMsg.body}</Banner>
        </div>
      )}

      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <div id="coa-queue">
          <Card
            title={<span className="vh-row" style={{ gap: 8 }}><FlaskConical {...I} aria-hidden /> CoA verification queue (A2)</span>}
            action={<StatusPill tone={coaQueue.length ? "warn" : "ok"}>{coaQueue.length} pending</StatusPill>}
          >
            <p className="small muted" style={{ marginTop: 0 }}>
              Each card is one batch&apos;s lab report. The reviewer checks the batch code on the certificate matches
              the batch code on the listing, and that Δ9-THC is <strong>≤ 0.3%</strong> — and writes down what they
              checked. Per batch, by a human, with a note: no one-click approve, no bulk approve.
            </p>
            {coaQueue.length === 0 ? (
              <p className="small muted">Queue is empty.</p>
            ) : (
              <div className="vh-grid cols-2">
                {coaQueue.map((p) => (
                  <div key={p.id} className="vh-card" style={{ padding: "var(--sp-3)", display: "grid", gap: "var(--sp-2)" }}>
                    <div className="vh-row-between" style={{ gap: 8 }}>
                      <span className="vh-row" style={{ gap: 8, minWidth: 0 }}>
                        <FlaskConical {...I} aria-hidden />
                        <strong>{p.title}</strong>
                      </span>
                      <ComplianceBadge cls={p.cls} />
                    </div>
                    <dl className="small" style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
                      <dt className="muted">Batch</dt>
                      <dd className="mono" style={{ margin: 0 }}>{p.batchCode || "—"}</dd>
                      <dt className="muted">Seller</dt>
                      <dd style={{ margin: 0 }}>{p.seller}</dd>
                      <dt className="muted">Δ9-THC limit</dt>
                      <dd className="mono" style={{ margin: 0 }}>≤ 0.3% <span className="muted">(re-checked server-side)</span></dd>
                    </dl>
                    <form action={decideCoaReview} style={{ display: "grid", gap: 8 }}>
                      <input type="hidden" name="productId" value={p.id} />
                      <label className="vh-label" htmlFor={`coan-${p.id}`}>Reviewer note (≥ 20 chars) <span className="req">*</span></label>
                      <textarea className="vh-textarea" id={`coan-${p.id}`} name="note" rows={2} maxLength={300}
                        placeholder={`e.g. Checked report for batch ${p.batchCode || "…"} — codes match, THC 0.21%.`} />
                      <div className="vh-row" style={{ gap: 8 }}>
                        <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit" name="decision" value="approve">Approve this batch</button>
                        <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit" name="decision" value="reject">Reject</button>
                      </div>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div id="approvals">
          <Card
            title={<span className="vh-row" style={{ gap: 8 }}><PackageCheck {...I} aria-hidden /> Listing approval queue</span>}
            action={<StatusPill tone={approvalQueue.length ? "warn" : "ok"}>{approvalQueue.length} awaiting</StatusPill>}
          >
            {approvalQueue.length === 0 ? (
              <p className="small muted" style={{ marginBottom: 0 }}>No listings awaiting approval.</p>
            ) : (
              <div className="vh-grid cols-2">
                {approvalQueue.map((p) => {
                  const gateBlocked = REGULATED_CLASSES.includes(p.cls) && p.coaState !== "APPROVED";
                  return (
                    <div key={p.id} className="vh-card" style={{ padding: "var(--sp-3)", display: "grid", gap: "var(--sp-2)" }}>
                      <div className="vh-row-between" style={{ gap: 8 }}>
                        <span className="vh-row" style={{ gap: 8, minWidth: 0 }}>
                          <span aria-hidden>{p.emoji}</span>
                          <strong>{p.title}</strong>
                        </span>
                        <MoneyText paise={p.pricePaise} />
                      </div>
                      <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <ComplianceBadge cls={p.cls} />
                        <span className="small muted">{p.seller}</span>
                        {gateBlocked && (
                          <StatusPill tone="danger">
                            <ShieldAlert size={12} strokeWidth={2.2} aria-hidden /> CoA gate closed (A2)
                          </StatusPill>
                        )}
                      </div>
                      <form action={moderateListing} style={{ display: "grid", gap: 8 }}>
                        <input type="hidden" name="productId" value={p.id} />
                        <textarea className="vh-textarea" name="note" rows={2} maxLength={300}
                          placeholder="Rejection note the seller will see (≥ 20 chars; not needed to approve)" aria-label={`Reviewer note for ${p.title}`} />
                        <div className="vh-row" style={{ gap: 8 }}>
                          <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit" name="decision" value="approve"
                            title={gateBlocked ? "The store will refuse this — the CoA gate is closed (A2)" : "Approve and go LIVE"}>
                            Approve → LIVE
                          </button>
                          <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit" name="decision" value="reject">Reject to draft</button>
                        </div>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div id="live">
          <Card title="Live catalogue — takedown & restore" pad0>
            <DataTable
              columns={liveColumns}
              rows={liveOrSuspended}
              empty={<div className="vh-empty">Nothing LIVE yet.</div>}
            />
          </Card>
        </div>

        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><Tags {...I} aria-hidden /> Taxonomy</span>}
          action={<Link className="vh-btn vh-btn-sm vh-btn-primary" href="/admin/catalogue/categories">Manage categories</Link>}
        >
          <p className="small muted" style={{ marginTop: 0 }}>
            Categories are editorial; compliance class is not. Moving a product between categories never changes its
            compliance class — that field is immutable after first approval, and no category may target the medical
            catalogue (A1).
          </p>
          <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
            {categories.map((c) => (
              <StatusPill key={c.id} tone={c.visible ? "neutral" : "warn"}>
                {c.emoji} {c.name}{c.visible ? "" : " · hidden"}
              </StatusPill>
            ))}
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
