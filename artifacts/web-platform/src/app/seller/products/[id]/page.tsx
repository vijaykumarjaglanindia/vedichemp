/**
 * VEDIC HEMP — PRODUCT EDITOR (§2.3, full CRUD)
 *
 * Loads from the live catalog store: edits here change what buyers see the
 * moment they're saved (LIVE listings) or the moment review approves them.
 * The right rail is the lifecycle: submit for review, unpublish, archive,
 * restore, delete — every transition re-validated by the state machine in
 * lib/catalog. Publishing to LIVE happens only through admin review, and a
 * regulated class without an APPROVED, batch-matched CoA cannot pass — there
 * is no `force_sellable` (A2). `params` is a Promise in Next 15.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock, FileUp, ImagePlus, ShieldAlert, Send, Archive, RotateCcw, Trash2, EyeOff } from "lucide-react";
import { Shell } from "../../Shell";
import { Banner, Card, StatusPill, toneForStatus, ComplianceBadge, MoneyText, type Column, DataTable } from "@/components/ui";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { findProduct, REGULATED_CLASSES } from "@/lib/catalog";
import { findSellerProduct, type Batch } from "../../_lib/data";
import { CLASS_META } from "@/lib/compliance";
import { productLifecycle, submitCoaForBatch, updateProductListing } from "../../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await findProduct(id);
  return { title: product ? product.title : "Product" };
}

const ERRORS: Record<string, string> = {
  title: "Title should be 8–150 characters — product + format + size.",
  claims: "The copy-check rejected claims language (cure/treat/prevent/heal). Describe composition and traditional use instead.",
  price: "Selling price must be a positive integer in paise.",
  mrp: "MRP must be an integer in paise, and the selling price cannot exceed it.",
  hsn: "HSN code should be 4–8 digits.",
  batch: "Batch code should be 4–20 characters (letters, digits, hyphens).",
  state: "That action isn't available in the listing's current state.",
  fixture: "Launch listings can be archived but not permanently deleted.",
  coa: "Blocked by the CoA gate (A2) — the batch needs an APPROVED, batch-matched lab report first.",
};

const DONE: Record<string, { title: string; body: string }> = {
  submit: { title: "Submitted for review", body: "A human reviewer approves every listing before it goes live. Regulated classes also need the batch CoA approved (A2)." },
  unpublish: { title: "Listing unpublished", body: "It's back in DRAFT and no longer visible to buyers. Submit it for review to relist." },
  archive: { title: "Listing archived", body: "It is absent from the catalogue, search and the sitemap. Restore it any time." },
  restore: { title: "Listing restored to DRAFT", body: "Edit it and submit for review to make it sellable again." },
};

function coaTone(status: Batch["coaStatus"]): "ok" | "warn" | "danger" {
  if (status === "APPROVED") return "ok";
  if (status === "PENDING_REVIEW") return "warn";
  return "danger";
}

export default async function ProductEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; done?: string; err?: string; coa?: string }>;
}) {
  const { id } = await params;
  const { saved, done, err, coa } = await searchParams;
  const product = await findProduct(id);
  if (!product) notFound();

  const meta = CLASS_META[product!.cls];
  const regulated = REGULATED_CLASSES.includes(product!.cls);
  const legacyBatches = findSellerProduct(id)?.batches ?? [];
  const doneMsg = done ? DONE[done] : undefined;

  const batchColumns: Column<Batch>[] = [
    { key: "code", header: "Batch", render: (b) => <span className="mono" style={{ fontWeight: 600 }}>{b.code}</span> },
    { key: "dates", header: "Mfg / Expiry", render: (b) => <span className="small tabular">{b.mfgDate} → {b.expiryDate}</span> },
    { key: "qty", header: "Qty", align: "right", render: (b) => <span className="tabular">{b.qty}<span className="small muted"> ({b.reserved} res.)</span></span> },
    {
      key: "coa", header: "CoA", render: (b) => (
        <div>
          <StatusPill tone={coaTone(b.coaStatus)}>{b.coaStatus.replace(/_/g, " ")}</StatusPill>
          {b.labReportId && <div className="small muted" style={{ marginTop: 2 }}>{b.labReportId}</div>}
          {b.note && <div className="small" style={{ color: "var(--vh-danger)", marginTop: 2 }}>{b.note}</div>}
        </div>
      ),
    },
  ];

  const lifecycleBtn = (op: string, label: string, Icon: typeof Send, variant = "vh-btn-ghost", confirmTitle?: string) => (
    <form action={productLifecycle} style={{ display: "flex" }}>
      <input type="hidden" name="productId" value={product!.id} />
      <input type="hidden" name="op" value={op} />
      <button className={`vh-btn vh-btn-sm ${variant}`} type="submit" style={{ flex: 1 }} title={confirmTitle}>
        <Icon size={14} strokeWidth={2.2} aria-hidden /> {label}
      </button>
    </form>
  );

  return (
    <Shell
      active="/seller/products"
      breadcrumb={["Seller Central", "Products", product!.title]}
      title={product!.title}
      actions={<StatusPill tone={toneForStatus(product!.status)}>{product!.status.replace(/_/g, " ")}</StatusPill>}
    >
      {saved && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="Changes saved">
            {product!.status === "LIVE"
              ? "The listing is LIVE — buyers see the new copy and price immediately."
              : "Saved to the draft. Submit for review when you're ready to sell."}
          </Banner>
        </div>
      )}
      {doneMsg && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title={doneMsg.title}>{doneMsg.body}</Banner>
        </div>
      )}
      {coa === "submitted" && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="CoA submitted for this batch">
            Compliance reviews every lab report (SLA ~4h). The batch cannot sell until it is APPROVED — no bulk approval, no override (A2).
          </Banner>
        </div>
      )}
      {err && ERRORS[err] && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger" title="That didn't go through">{ERRORS[err]}</Banner>
        </div>
      )}
      {product!.reviewNote && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="warn" title="Reviewer note">{product!.reviewNote}</Banner>
        </div>
      )}

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        {/* ── Left: the edit form (writes to the live store) ── */}
        <form action={updateProductListing} className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <input type="hidden" name="productId" value={product!.id} />
          <Card title="Listing details">
            <div className="vh-grid" style={{ gap: 16 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="title">Title <span className="req">*</span></label>
                <input className="vh-input" id="title" name="title" type="text" defaultValue={product!.title} maxLength={150} />
                <span className="vh-help">Lead with the product, not claims — copy is compliance-checked on save.</span>
              </div>

              <div className="vh-field">
                <label className="vh-label" htmlFor="desc">Description</label>
                <RichTextEditor
                  name="desc"
                  id="desc"
                  defaultValue={product!.desc}
                  maxLength={2000}
                  minHeight={120}
                  placeholder="Composition, format and traditional use — no disease or cure claims."
                  help="Wellness copy describes composition and traditional use only (Drugs & Magic Remedies Act)."
                />
              </div>

              <div className="vh-field">
                <span className="vh-label">Compliance class</span>
                <div className="vh-row-between" style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: "10px 13px", background: "var(--vh-bg-subtle)" }}>
                  <ComplianceBadge cls={product!.cls} />
                  <span className="vh-row small muted" style={{ gap: 6 }}>
                    <Lock size={13} strokeWidth={2.2} aria-hidden /> Locked after creation
                  </span>
                </div>
                <span className="vh-help">
                  {meta.label} drives pricing rules, CoA requirements, shipping and advertisability everywhere.
                  Changing class means creating a new listing.
                </span>
              </div>

              <div className="vh-grid cols-2" style={{ gap: 16 }}>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="price">Selling price (paise) <span className="req">*</span></label>
                  <input className="vh-input" id="price" name="pricePaise" type="number" min={0} step={1} defaultValue={product!.pricePaise} />
                  <span className="vh-help">Integer paise. Renders as <MoneyText paise={product!.pricePaise} /></span>
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="mrp">MRP (paise) <span className="req">*</span></label>
                  <input className="vh-input" id="mrp" name="mrpPaise" type="number" min={0} step={1} defaultValue={product!.mrpPaise} />
                  <span className="vh-help">Renders as <MoneyText paise={product!.mrpPaise} /> · price must not exceed MRP</span>
                </div>
              </div>

              <div className="vh-field">
                <label className="vh-label" htmlFor="hsn">HSN code <span className="req">*</span></label>
                <input className="vh-input mono" id="hsn" name="hsn" type="text" defaultValue={product!.hsn} maxLength={8} />
                <span className="vh-help">Determines the GST rate on every invoice line.</span>
              </div>

              <button className="vh-btn vh-btn-primary" type="submit">Save changes</button>
            </div>
          </Card>

          <Card title="Media" action={<span className="small muted">First image is the search thumbnail</span>}>
            <div className="vh-grid cols-4" style={{ gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ aspectRatio: "1", borderRadius: "var(--vh-radius-sm)", background: "var(--vh-green-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", border: "1px solid var(--vh-line)" }} aria-hidden>
                  {product!.emoji}
                </div>
              ))}
              <label className="vh-dropzone" aria-label="Add product image" style={{ aspectRatio: "1", padding: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer" }}>
                <input type="file" accept="image/*" style={{ display: "none" }} />
                <ImagePlus size={18} strokeWidth={2.2} aria-hidden />
                <span className="small">Add</span>
              </label>
            </div>
            <p className="small muted" style={{ margin: "10px 0 0" }}>Pack shots only — imagery implying medical outcomes fails the creative review.</p>
          </Card>
        </form>

        {/* ── Right rail: lifecycle, CoA, batches ───────────── */}
        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card title="Listing lifecycle">
            <div className="vh-row-between" style={{ marginBottom: 12 }}>
              <span className="small muted">Current state</span>
              <StatusPill tone={toneForStatus(product!.status)}>{product!.status.replace(/_/g, " ")}</StatusPill>
            </div>
            {regulated && (
              <div className="vh-row-between" style={{ marginBottom: 12 }}>
                <span className="small muted">CoA gate (A2)</span>
                <StatusPill tone={product!.coaState === "APPROVED" ? "ok" : "danger"}>
                  {product!.coaState === "APPROVED" ? `Open — batch ${product!.batchCode}` : `Closed — ${product!.coaState.replace(/_/g, " ").toLowerCase()}`}
                </StatusPill>
              </div>
            )}

            <div className="vh-grid" style={{ gap: 8 }}>
              {product!.status === "DRAFT" && lifecycleBtn("submit", "Submit for review", Send, "vh-btn-primary")}
              {product!.status === "UNDER_REVIEW" && (
                <p className="small muted" style={{ margin: 0 }}>
                  In the review queue. A human reviewer approves every listing — regulated classes only pass once the batch CoA is APPROVED (A2).
                </p>
              )}
              {product!.status === "LIVE" && lifecycleBtn("unpublish", "Unpublish (back to draft)", EyeOff)}
              {product!.status === "SUSPENDED" && (
                <p className="small" style={{ margin: 0, color: "var(--vh-danger)" }}>
                  Suspended by the marketplace. Fix the issue in the reviewer note — an admin restores it after re-checking the gate.
                </p>
              )}
              {product!.status !== "ARCHIVED" && lifecycleBtn("archive", "Archive listing", Archive)}
              {product!.status === "ARCHIVED" && lifecycleBtn("restore", "Restore to draft", RotateCcw, "vh-btn-primary")}
              {product!.custom && (product!.status === "DRAFT" || product!.status === "ARCHIVED") &&
                lifecycleBtn("delete", "Delete permanently", Trash2, "vh-btn-danger", "Only drafts and archived runtime listings can be hard-deleted")}
            </div>

            {regulated && product!.coaState !== "APPROVED" && (
              <div className="vh-row" role="alert" style={{ alignItems: "flex-start", gap: 8, marginTop: 12, padding: "10px 12px", borderRadius: "var(--vh-radius-sm)", border: "1px solid var(--vh-line)", borderLeft: "3px solid var(--vh-danger)", background: "color-mix(in srgb, var(--vh-danger-bg) 45%, var(--vh-surface))" }}>
                <ShieldAlert size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-danger)", marginTop: 2, flexShrink: 0 }} />
                <div className="small">
                  <strong>The CoA gate is closed.</strong> Review cannot approve this listing until the batch has an
                  APPROVED, batch-matched Certificate of Analysis. Enforced server-side — there is no
                  senior-approval override and no <span className="mono">force_sellable</span> flag.
                </div>
              </div>
            )}
          </Card>

          {regulated && (
            <div id="coa-upload">
              <Card title="Submit a batch Certificate of Analysis">
                <form action={submitCoaForBatch} className="vh-grid" style={{ gap: 12 }}>
                  <input type="hidden" name="productId" value={product!.id} />
                  <div className="vh-dropzone">
                    <FileUp size={20} strokeWidth={2.2} aria-hidden style={{ marginBottom: 8 }} />
                    <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--vh-ink)" }}>Drop the lab report PDF here</div>
                    <div className="small" style={{ marginTop: 4 }}>
                      Must state the exact batch code. Compliance reviews every submission (SLA ~4h) — no bulk approval, no override (A2).
                    </div>
                  </div>
                  <div className="vh-field">
                    <label className="vh-label" htmlFor="batchCode">Batch code on the report <span className="req">*</span></label>
                    <input className="vh-input mono" id="batchCode" name="batchCode" type="text" placeholder="e.g. VB-2410" defaultValue={product!.batchCode} />
                    <span className="vh-help">A CoA that does not match the batch code exactly is rejected.</span>
                  </div>
                  <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit">Submit CoA for review</button>
                </form>
              </Card>
            </div>
          )}

          {legacyBatches.length > 0 && (
            <div id="batches">
              <Card title="Batches" action={<span className="small muted">A2 gates per batch</span>} pad0>
                <DataTable columns={batchColumns} rows={legacyBatches} />
              </Card>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
