/**
 * VEDIC HEMP — PRODUCT EDITOR (§2.3)
 *
 * `params` is a Promise in Next 15 and must be awaited. Batches show CoA
 * status per batch; "Publish" is disabled with remediation text whenever a
 * batch's CoA is not APPROVED and batch-matched (A2). There is no
 * `force_sellable` — the server, not this button, is the authority.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock, FileUp, ImagePlus, Globe, ShieldAlert, ArrowRight } from "lucide-react";
import { Shell } from "../../Shell";
import { Card, StatusPill, toneForStatus, ComplianceBadge, MoneyText, type Column, DataTable } from "@/components/ui";
import { findSellerProduct, type Batch } from "../../_lib/data";
import { CLASS_META } from "@/lib/compliance";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = findSellerProduct(id);
  return { title: product ? product.title : "Product" };
}

function coaTone(status: Batch["coaStatus"]): "ok" | "warn" | "danger" {
  if (status === "APPROVED") return "ok";
  if (status === "PENDING_REVIEW") return "warn";
  return "danger";
}

export default async function ProductEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = findSellerProduct(id);
  if (!product) notFound();

  const meta = CLASS_META[product.cls];
  const gateOpen = product.batches.length > 0 && product.batches.every((b) => b.coaStatus === "APPROVED");
  const blockedBatches = product.batches.filter((b) => b.coaStatus !== "APPROVED");

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
    {
      key: "actions", header: "", align: "right", render: (b) =>
        b.coaStatus === "APPROVED"
          ? <span className="small muted">Sellable</span>
          : <a className="small" href="#coa-upload" style={{ fontWeight: 700 }}>Upload CoA →</a>,
    },
  ];

  return (
    <Shell
      active="/seller/products"
      breadcrumb={["Seller Central", "Products", product.title]}
      title={product.title}
      actions={<StatusPill tone={toneForStatus(product.listingState)}>{product.listingState}</StatusPill>}
    >
      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        {/* ── Left: editor form ─────────────────────────────── */}
        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card title="Listing details">
            <div className="vh-grid" style={{ gap: 16 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="title">Title <span className="req">*</span></label>
                <input className="vh-input" id="title" name="title" type="text" defaultValue={product.title} maxLength={150} />
                <span className="vh-help">{product.title.length}/150 · Lead with the product, not claims — copy is compliance-checked.</span>
              </div>

              <div className="vh-field">
                <span className="vh-label">Compliance class</span>
                <div className="vh-row-between" style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: "10px 13px", background: "var(--vh-bg-subtle)" }}>
                  <ComplianceBadge cls={product.cls} />
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
                  <label className="vh-label" htmlFor="price">Selling price <span className="req">*</span></label>
                  <input className="vh-input" id="price" name="pricePaise" type="number" min={0} step={1} defaultValue={product.pricePaise} />
                  <span className="vh-help">Integer paise. Renders as <MoneyText paise={product.pricePaise} /></span>
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="mrp">MRP <span className="req">*</span></label>
                  <input className="vh-input" id="mrp" name="mrpPaise" type="number" min={0} step={1} defaultValue={product.mrpPaise} />
                  <span className="vh-help">Renders as <MoneyText paise={product.mrpPaise} /> · price must not exceed MRP</span>
                </div>
              </div>

              <div className="vh-field">
                <label className="vh-label" htmlFor="hsn">HSN code <span className="req">*</span></label>
                <input className="vh-input mono" id="hsn" name="hsn" type="text" defaultValue={product.hsn} maxLength={8} />
                <span className="vh-help">Determines GST rate on the invoice. 8 digits for regulated wellness lines.</span>
              </div>
            </div>
          </Card>

          <Card title="Media" action={<span className="small muted">First image is the search thumbnail</span>}>
            <div className="vh-grid cols-4" style={{ gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ aspectRatio: "1", borderRadius: "var(--vh-radius-sm)", background: "var(--vh-green-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", border: "1px solid var(--vh-line)" }} aria-hidden>
                  {product.emoji}
                </div>
              ))}
              <button type="button" className="vh-dropzone" aria-label="Add product image" style={{ aspectRatio: "1", padding: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer" }}>
                <ImagePlus size={18} strokeWidth={2.2} aria-hidden />
                <span className="small">Add</span>
              </button>
            </div>
            <p className="small muted" style={{ margin: "10px 0 0" }}>Pack shots only — imagery implying medical outcomes fails the creative review.</p>
          </Card>

          <Card title="Search preview" action={<Globe size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} />}>
            <div style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: "12px 16px" }}>
              <div className="small" style={{ color: "var(--vh-muted)" }}>vedichemp.in › {meta.short.toLowerCase().replace(/ /g, "-")} › {product.slug}</div>
              <div style={{ color: "var(--vh-info)", fontSize: "1.02rem", fontWeight: 600, marginTop: 2 }}>
                {product.title} | Lab-tested | Vedic Botanicals
              </div>
              <div className="small" style={{ marginTop: 2 }}>
                {meta.blurb} Every batch ships with a verifiable Certificate of Analysis. MRP <MoneyText paise={product.mrpPaise} />, our price <MoneyText paise={product.pricePaise} />.
              </div>
            </div>
            <div className="vh-field" style={{ marginTop: 16 }}>
              <label className="vh-label" htmlFor="metaDesc">Meta description</label>
              <textarea className="vh-textarea" id="metaDesc" name="metaDesc" rows={2} maxLength={160} defaultValue={meta.blurb} />
              <span className="vh-help">{meta.blurb.length}/160 · No disease claims — the copy-check blocks the save otherwise.</span>
            </div>
          </Card>
        </div>

        {/* ── Right rail: publish state, batches, CoA ───────── */}
        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card title="Publish state">
            <div className="vh-row-between" style={{ marginBottom: 12 }}>
              <span className="small muted">Listing</span>
              <StatusPill tone={toneForStatus(product.listingState)}>{product.listingState}</StatusPill>
            </div>
            <div className="vh-row-between" style={{ marginBottom: 12 }}>
              <span className="small muted">CoA gate (A2)</span>
              <StatusPill tone={gateOpen ? "ok" : "danger"}>{gateOpen ? "Open — all batches approved" : `Closed — ${blockedBatches.length} batch(es) blocked`}</StatusPill>
            </div>
            <button
              className="vh-btn vh-btn-primary"
              type="button"
              disabled={!gateOpen}
              style={{ width: "100%" }}
              title={gateOpen ? "Publish this listing" : "Blocked: at least one batch lacks an APPROVED, batch-matched CoA (A2)"}
            >
              Publish
            </button>
            {!gateOpen && (
              <div className="vh-row" role="alert" style={{ alignItems: "flex-start", gap: 8, marginTop: 12, padding: "10px 12px", borderRadius: "var(--vh-radius-sm)", border: "1px solid var(--vh-line)", borderLeft: "3px solid var(--vh-danger)", background: "color-mix(in srgb, var(--vh-danger-bg) 45%, var(--vh-surface))" }}>
                <ShieldAlert size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-danger)", marginTop: 2, flexShrink: 0 }} />
                <div className="small">
                  <strong>Publish is blocked by the CoA gate.</strong> Every batch needs an APPROVED, batch-matched
                  Certificate of Analysis before it can sell. This is enforced server-side — there is no
                  senior-approval override and no <span className="mono">force_sellable</span> flag.
                  <a href="#coa-upload" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontWeight: 700 }}>
                    Upload the missing CoA <ArrowRight size={13} strokeWidth={2.4} aria-hidden />
                  </a>
                </div>
              </div>
            )}
          </Card>

          <div id="batches">
            <Card title="Batches" action={<span className="small muted">A2 gates per batch</span>} pad0>
              <DataTable
                columns={batchColumns}
                rows={product.batches}
                empty={<div className="vh-empty">No batches yet. Add a batch and its CoA before this product can be published (A2).</div>}
              />
            </Card>
          </div>

          <div id="coa-upload">
            <Card title="Upload Certificate of Analysis">
              <div className="vh-dropzone">
                <FileUp size={20} strokeWidth={2.2} aria-hidden style={{ marginBottom: 8 }} />
                <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--vh-ink)" }}>Drop the lab report PDF here</div>
                <div className="small" style={{ marginTop: 4 }}>
                  Must state the exact batch code. Compliance reviews every submission (SLA ~4h) — there is no bulk
                  approval and no override (A2).
                </div>
              </div>
              <div className="vh-field" style={{ marginTop: 16 }}>
                <label className="vh-label" htmlFor="batchCode">Batch code on the report <span className="req">*</span></label>
                <input className="vh-input mono" id="batchCode" name="batchCode" type="text" placeholder="e.g. VB-2410" />
                <span className="vh-help">A CoA that does not match the batch code exactly is rejected.</span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
