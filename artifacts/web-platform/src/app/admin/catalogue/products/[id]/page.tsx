/**
 * VEDIC HEMP — LISTING MANAGER (admin, on behalf of the seller)
 *
 * One listing, every control: edit any field, drive any lifecycle
 * transition, submit the batch CoA — all audited as *_OBO with the seller
 * named. The gates are the same ones the seller faces: approve goes through
 * the review action (A2-checked in the store), hard-delete needs a written
 * reason and only works on runtime drafts/archived, and compliance class is
 * immutable — for an admin too.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Archive, EyeOff, FileUp, Lock, RotateCcw, Send, Trash2 } from "lucide-react";
import { Shell } from "../../../Shell";
import { Banner, Card, ComplianceBadge, MoneyText, StatusPill, toneForStatus } from "@/components/ui";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { findProduct, REGULATED_CLASSES } from "@/lib/catalog";
import { adminListingLifecycle, adminSaveListing, adminSubmitCoa, clearClaimsStrike, moderateListing, takedownListing } from "../../../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await findProduct(id);
  return { title: product ? `${product.title} · Admin` : "Listing · Admin" };
}

const ERRORS: Record<string, string> = {
  title: "Title should be 8–150 characters.",
  claims: "Claims language rejected — the attempt was logged.",
  price: "Selling price must be a positive integer in paise.",
  mrp: "MRP must be an integer in paise, at or above the selling price.",
  hsn: "HSN code should be 4–8 digits.",
  batch: "Batch code should be 4–20 characters (letters, digits, hyphens).",
  reason: "Deleting a listing needs a written reason of at least 20 characters. The attempt was logged.",
  state: "That action isn't available in the listing's current state.",
  fixture: "Launch listings can be archived but never hard-deleted.",
  coa: "Blocked by the CoA gate (A2) — no approved, batch-matched lab report.",
};

const DONE: Record<string, string> = {
  submit: "Submitted for review on the seller's behalf.",
  unpublish: "Unpublished — back to DRAFT, absent for buyers.",
  archive: "Archived — absent from every public surface.",
  restore: "Restored to DRAFT.",
};

export default async function AdminListingManagerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; created?: string; done?: string; err?: string; coa?: string; strike?: string }>;
}) {
  const { id } = await params;
  const { saved, created, done, err, coa, strike } = await searchParams;
  const product = await findProduct(id);
  if (!product) notFound();
  const regulated = REGULATED_CLASSES.includes(product!.cls);

  const lifecycleBtn = (op: string, label: string, Icon: typeof Send, variant = "vh-btn-ghost") => (
    <form action={adminListingLifecycle} style={{ display: "flex" }}>
      <input type="hidden" name="productId" value={product!.id} />
      <input type="hidden" name="op" value={op} />
      <button className={`vh-btn vh-btn-sm ${variant}`} type="submit" style={{ flex: 1 }}>
        <Icon size={14} strokeWidth={2.2} aria-hidden /> {label}
      </button>
    </form>
  );

  return (
    <Shell
      active="/admin/catalogue"
      breadcrumb={["Admin", "Catalogue", "All listings", product!.title]}
      title={product!.title}
      actions={
        <span className="vh-row" style={{ gap: 8 }}>
          <StatusPill tone={toneForStatus(product!.status)}>{product!.status.replace(/_/g, " ")}</StatusPill>
          <Link href="/admin/catalogue/products" className="vh-btn vh-btn-sm vh-btn-ghost vh-row" style={{ gap: 6 }}>
            <ArrowLeft size={14} strokeWidth={2.2} aria-hidden /> All listings
          </Link>
        </span>
      }
    >
      {(saved || created) && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title={created ? "Listing created (DRAFT)" : "Changes saved"}>
            {created
              ? `Created on behalf of ${product!.seller} and audited. Submit it for review below — it cannot skip the queue.`
              : `Saved on behalf of ${product!.seller} and audited. LIVE listings show the new copy immediately.`}
          </Banner>
        </div>
      )}
      {done && DONE[done] && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title={DONE[done]}>Audited as an on-behalf-of action naming {product!.seller}.</Banner>
        </div>
      )}
      {coa === "submitted" && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="CoA submitted on the seller's behalf">
            It joined the same PENDING_REVIEW queue as every other batch — submission is not approval (A2).
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
          <Banner severity="warn" title="Current reviewer note (the seller sees this)">{product!.reviewNote}</Banner>
        </div>
      )}
      {strike === "cleared" && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="Claims strike cleared">The listing may enter ad campaigns again. The clearance and its reason are in the audit trail.</Banner>
        </div>
      )}

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        {/* ── Edit any field, on the seller's behalf ────────── */}
        <form action={adminSaveListing} className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <input type="hidden" name="productId" value={product!.id} />
          <Card title={`Listing details — ${product!.seller}`}>
            <div className="vh-grid" style={{ gap: 16 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="title">Title <span className="req">*</span></label>
                <input className="vh-input" id="title" name="title" type="text" defaultValue={product!.title} maxLength={150} />
                <span className="vh-help">Same claims copy-check as Seller Central — admin copy isn&apos;t exempt.</span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="desc">Description</label>
                <RichTextEditor
                  name="desc"
                  id="desc"
                  defaultValue={product!.desc}
                  maxLength={2000}
                  minHeight={110}
                  placeholder="Composition, format and traditional use — no disease or cure claims."
                />
              </div>
              <div className="vh-field">
                <span className="vh-label">Compliance class</span>
                <div className="vh-row-between" style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: "10px 13px", background: "var(--vh-bg-subtle)" }}>
                  <ComplianceBadge cls={product!.cls} />
                  <span className="vh-row small muted" style={{ gap: 6 }}>
                    <Lock size={13} strokeWidth={2.2} aria-hidden /> Immutable — for admins too
                  </span>
                </div>
              </div>
              <div className="vh-grid cols-3" style={{ gap: 16 }}>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="price">Price (paise) <span className="req">*</span></label>
                  <input className="vh-input" id="price" name="pricePaise" type="number" min={0} step={1} defaultValue={product!.pricePaise} />
                  <span className="vh-help">Now <MoneyText paise={product!.pricePaise} /></span>
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="mrp">MRP (paise) <span className="req">*</span></label>
                  <input className="vh-input" id="mrp" name="mrpPaise" type="number" min={0} step={1} defaultValue={product!.mrpPaise} />
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="hsn">HSN <span className="req">*</span></label>
                  <input className="vh-input mono" id="hsn" name="hsn" type="text" defaultValue={product!.hsn} maxLength={8} />
                </div>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="emoji">Tile emoji</label>
                <input className="vh-input" id="emoji" name="emoji" type="text" defaultValue={product!.emoji} maxLength={4} style={{ maxWidth: 120 }} />
              </div>
              <button className="vh-btn vh-btn-primary" type="submit">Save on seller&apos;s behalf</button>
            </div>
          </Card>
        </form>

        {/* ── Lifecycle + CoA + review controls ─────────────── */}
        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card title="Lifecycle (on the seller's behalf)">
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
                <form action={moderateListing} className="vh-grid" style={{ gap: 8 }}>
                  <input type="hidden" name="productId" value={product!.id} />
                  <textarea className="vh-textarea" name="note" rows={2} maxLength={300} placeholder="Rejection note the seller will see (≥ 20 chars; not needed to approve)" aria-label="Reviewer note" />
                  <div className="vh-row" style={{ gap: 8 }}>
                    <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit" name="decision" value="approve">Approve → LIVE</button>
                    <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit" name="decision" value="reject">Reject to draft</button>
                  </div>
                </form>
              )}
              {product!.status === "LIVE" && lifecycleBtn("unpublish", "Unpublish (back to draft)", EyeOff)}
              {product!.status === "SUSPENDED" && (
                <form action={takedownListing} style={{ display: "flex" }}>
                  <input type="hidden" name="productId" value={product!.id} />
                  <input type="hidden" name="op" value="restore" />
                  <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit" style={{ flex: 1 }}>Restore to LIVE (A2 re-checked)</button>
                </form>
              )}
              {product!.status !== "ARCHIVED" && lifecycleBtn("archive", "Archive listing", Archive)}
              {product!.status === "ARCHIVED" && lifecycleBtn("restore", "Restore to draft", RotateCcw, "vh-btn-primary")}
            </div>
          </Card>

          {product!.claimsStrike && (
            <Card title="Medical-claims strike — barred from advertising">
              <p className="small" style={{ marginTop: 0, color: "var(--vh-danger)" }}>
                An attempt to save claims copy was rejected and logged on this listing. It cannot enter any
                ad campaign while flagged. Clear the flag only after reviewing the listing with the seller.
              </p>
              <form action={clearClaimsStrike} className="vh-grid" style={{ gap: 10 }}>
                <input type="hidden" name="productId" value={product!.id} />
                <label className="vh-label" htmlFor="strike-reason">Clearance reason (≥ 20 chars, audited) <span className="req">*</span></label>
                <textarea className="vh-textarea" id="strike-reason" name="reason" rows={2} maxLength={300}
                  placeholder="e.g. Reviewed with seller on call; copy re-written to composition-only language." />
                <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit" style={{ justifySelf: "start" }}>Clear strike</button>
              </form>
            </Card>
          )}

          {product!.custom && (product!.status === "DRAFT" || product!.status === "ARCHIVED") && (
            <Card title="Delete permanently">
              <form action={adminListingLifecycle} className="vh-grid" style={{ gap: 10 }}>
                <input type="hidden" name="productId" value={product!.id} />
                <input type="hidden" name="op" value="delete" />
                <label className="vh-label" htmlFor="del-reason">Reason (≥ 20 chars, audited) <span className="req">*</span></label>
                <textarea className="vh-textarea" id="del-reason" name="reason" rows={2} maxLength={300} placeholder="e.g. Seller confirmed by email this was a duplicate draft." />
                <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit" style={{ justifySelf: "start" }}>
                  <Trash2 size={14} strokeWidth={2.2} aria-hidden /> Delete this listing
                </button>
              </form>
              <p className="small muted" style={{ margin: "8px 0 0" }}>
                Only runtime drafts/archived listings hard-delete. Anything that has sold stays archived — order history never dangles.
              </p>
            </Card>
          )}

          {regulated && (
            <Card title="Submit batch CoA on the seller's behalf">
              <form action={adminSubmitCoa} className="vh-grid" style={{ gap: 10 }}>
                <input type="hidden" name="productId" value={product!.id} />
                <div className="vh-row" style={{ alignItems: "flex-start", gap: 8 }}>
                  <FileUp size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)", marginTop: 3, flexShrink: 0 }} />
                  <p className="small muted" style={{ margin: 0 }}>
                    For lab reports the seller sent by email. It joins the same review queue — submitting is not approving (A2).
                  </p>
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="batchCode">Batch code on the report <span className="req">*</span></label>
                  <input className="vh-input mono" id="batchCode" name="batchCode" type="text" placeholder="e.g. AF-3101" defaultValue={product!.batchCode} />
                </div>
                <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit" style={{ justifySelf: "start" }}>Submit CoA for review</button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </Shell>
  );
}
