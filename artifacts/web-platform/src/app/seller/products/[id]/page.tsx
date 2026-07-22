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
import { Lock, FileUp, ImagePlus, ShieldAlert, Send, Archive, RotateCcw, Trash2, EyeOff, Star, Copy, Tag } from "lucide-react";
import { Shell } from "../../Shell";
import { Banner, Card, StatusPill, toneForStatus, ComplianceBadge, MoneyText, type Column, DataTable } from "@/components/ui";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { findProduct, hasVariants, REGULATED_CLASSES, saleActive } from "@/lib/catalog";
import { readCategories } from "@/lib/categories";
import { sellerData, type Batch } from "../../_lib/data";
import { actingStore } from "../../_lib/store";
import { CLASS_META } from "@/lib/compliance";
import {
  addProductVariant, productLifecycle, removeProductVariant, saveOptionName,
  submitCoaForBatch, updateProductListing, updateProductVariant,
  uploadProductImage, deleteProductImage, setMainProductImage, duplicateProduct,
  addWholesaleTierAction, removeWholesaleTierAction,
} from "../../actions";

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
  coa: "Blocked by the CoA gate — the batch needs an APPROVED, batch-matched lab report first.",
  shortdesc: "The short summary should be 160 characters or fewer.",
  weight: "Weight should be a whole number of grams.",
  fssai: "An FSSAI licence number is exactly 14 digits.",
  shelf: "Shelf life should be a whole number of months (0–120).",
  minqty: "Minimum per order should be a whole number between 1 and 50.",
  maxqty: "Maximum per order should be a whole number between 1 and 50.",
  qtyrange: "Maximum per order can't be less than the minimum.",
  shipflat: "The flat delivery fee should be a whole number of paise (1–100000).",
  saleprice: "The sale price must be a positive whole number in paise.",
  salehigh: "The sale price must be lower than the regular selling price.",
  saledates: "The sale end date can't be before the start date.",
  imgfile: "Choose an image file to upload.",
  imgsize: "That image is too large — keep photos under 1.5 MB.",
  imgtype: "Use a JPG, PNG, WEBP, GIF or SVG image.",
  imgfull: "You can add up to 6 photos. Remove one first.",
};

const DONE: Record<string, { title: string; body: string }> = {
  submit: { title: "Submitted for review", body: "A human reviewer approves every listing before it goes live. Regulated classes also need the batch CoA approved." },
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
  searchParams: Promise<{ saved?: string; done?: string; err?: string; coa?: string; vdone?: string; img?: string; duplicated?: string; wdone?: string }>;
}) {
  const { id } = await params;
  const { saved, done, err, coa, vdone, img, duplicated, wdone } = await searchParams;
  const product = await findProduct(id);
  if (!product) notFound();

  const meta = CLASS_META[product!.cls];
  const regulated = REGULATED_CLASSES.includes(product!.cls);
  const legacyBatches = sellerData(await actingStore()).findSellerProduct(id)?.batches ?? [];
  const doneMsg = done ? DONE[done] : undefined;
  const images = product!.images ?? [];
  const categories = (await readCategories({ includeHidden: true })).filter((c) => !c.cls || c.cls === product!.cls);
  const onSale = saleActive(product!);

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
      {duplicated && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="Copy created">This is a fresh draft copied from the original. Edit it, then submit it for review when you're ready to sell.</Banner>
        </div>
      )}
      {img && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title={img === "added" ? "Photo added" : img === "removed" ? "Photo removed" : "Main photo updated"}>
            {img === "main" ? "This is now the first photo buyers see." : "Your product photos show on the product page, in search and on your store."}
          </Banner>
        </div>
      )}
      {coa === "submitted" && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="CoA submitted for this batch">
            Compliance reviews every lab report (SLA ~4h). The batch cannot sell until it is APPROVED — no bulk approval, no override.
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
      {product!.claimsStrike && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger" title="No listing may make medical claims — this listing is barred from advertising">
            An attempt to save claims copy (cure / treat / prevent / diagnose) was rejected on this listing
            and logged. Until compliance clears the flag, this listing cannot enter any ad campaign.
            Describe composition and traditional use instead — that is the platform rule, for everyone.
          </Banner>
        </div>
      )}

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        {/* ── Left: the edit form + gallery + duplicate ── */}
        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
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
            </div>
          </Card>

          {/* More details — brand, tags, summary, category, SKU, weight */}
          <Card title="More details">
            <div className="vh-grid" style={{ gap: 16 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="shortDesc">Short summary</label>
                <input className="vh-input" id="shortDesc" name="shortDesc" maxLength={160} defaultValue={product!.shortDesc ?? ""} placeholder="One line shoppers see first, e.g. Cold-pressed, single-origin, lab-tested." />
                <span className="vh-help">Up to 160 characters. Shows on the product card and above the description.</span>
              </div>
              <div className="vh-grid cols-2" style={{ gap: 16 }}>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="brand">Brand</label>
                  <input className="vh-input" id="brand" name="brand" maxLength={60} defaultValue={product!.brand ?? ""} placeholder="e.g. Vedic Botanicals" />
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="categoryId">Category</label>
                  <select className="vh-select" id="categoryId" name="categoryId" defaultValue={product!.categoryId ?? ""}>
                    <option value="">— None —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.parentId ? "— " : ""}{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="tags">Tags</label>
                <input className="vh-input" id="tags" name="tags" defaultValue={(product!.tags ?? []).join(", ")} placeholder="vegan, gluten-free, gift" />
                <span className="vh-help">Comma-separated words shoppers might search for. Up to 12.</span>
              </div>
              <div className="vh-grid cols-2" style={{ gap: 16 }}>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="sku">SKU (your code)</label>
                  <input className="vh-input mono" id="sku" name="sku" maxLength={40} defaultValue={product!.sku ?? ""} placeholder="VB-BALM-30" />
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="weightGrams">Weight (grams)</label>
                  <input className="vh-input" id="weightGrams" name="weightGrams" type="number" min={0} defaultValue={product!.weightGrams ?? ""} placeholder="120" />
                  <span className="vh-help">Used to work out delivery.</span>
                </div>
              </div>
              <div className="vh-grid cols-2" style={{ gap: 16, marginTop: 16 }}>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="minOrderQty">Minimum per order</label>
                  <input className="vh-input" id="minOrderQty" name="minOrderQty" type="number" min={1} max={50} defaultValue={product!.minOrderQty ?? ""} placeholder="1" />
                  <span className="vh-help">Buyers must order at least this many. Leave blank for 1.</span>
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="maxOrderQty">Maximum per order</label>
                  <input className="vh-input" id="maxOrderQty" name="maxOrderQty" type="number" min={1} max={50} defaultValue={product!.maxOrderQty ?? ""} placeholder="10" />
                  <span className="vh-help">The most a buyer can order at once. Leave blank for the default (10).</span>
                </div>
              </div>

              <fieldset className="vh-field" style={{ border: 0, padding: 0, margin: "16px 0 0" }}>
                <legend className="vh-label">Product label &amp; specification</legend>
                <span className="vh-help" style={{ marginBottom: 8 }}>Label facts shown in the specification table. No disease claims — the claims check applies here too.</span>
                <div className="vh-grid cols-2" style={{ gap: 16 }}>
                  <div className="vh-field">
                    <label className="vh-label" htmlFor="netQuantity">Net quantity</label>
                    <input className="vh-input" id="netQuantity" name="netQuantity" maxLength={60} defaultValue={product!.netQuantity ?? ""} placeholder="30 g · 250 ml · 60 capsules" />
                  </div>
                  <div className="vh-field">
                    <label className="vh-label" htmlFor="marketer">Marketed by</label>
                    <input className="vh-input" id="marketer" name="marketer" maxLength={120} defaultValue={product!.marketer ?? ""} placeholder="Brand name, city" />
                  </div>
                </div>
                <div className="vh-field" style={{ marginTop: 12 }}>
                  <label className="vh-label" htmlFor="ingredients">Ingredients / composition</label>
                  <textarea className="vh-textarea" id="ingredients" name="ingredients" rows={2} maxLength={500} defaultValue={product!.ingredients ?? ""} placeholder="Key actives and full ingredient list" />
                </div>
                <div className="vh-field" style={{ marginTop: 12 }}>
                  <label className="vh-label" htmlFor="directions">Directions for use</label>
                  <textarea className="vh-textarea" id="directions" name="directions" rows={2} maxLength={300} defaultValue={product!.directions ?? ""} placeholder="How to use — dosage, frequency. No disease claims." />
                </div>
                <div className="vh-grid cols-2" style={{ gap: 16, marginTop: 12 }}>
                  <div className="vh-field">
                    <label className="vh-label" htmlFor="storage">Storage</label>
                    <input className="vh-input" id="storage" name="storage" maxLength={160} defaultValue={product!.storage ?? ""} placeholder="Store in a cool, dry place" />
                  </div>
                  <div className="vh-field">
                    <label className="vh-label" htmlFor="countryOfOrigin">Country of origin</label>
                    <input className="vh-input" id="countryOfOrigin" name="countryOfOrigin" maxLength={60} defaultValue={product!.countryOfOrigin ?? ""} placeholder="India" />
                  </div>
                  <div className="vh-field">
                    <label className="vh-label" htmlFor="shelfLifeMonths">Shelf life (months)</label>
                    <input className="vh-input" id="shelfLifeMonths" name="shelfLifeMonths" type="number" min={0} max={120} defaultValue={product!.shelfLifeMonths ?? ""} placeholder="24" />
                  </div>
                  <div className="vh-field">
                    <label className="vh-label" htmlFor="fssaiLicNo">FSSAI licence no. <span className="muted small">(food only)</span></label>
                    <input className="vh-input mono" id="fssaiLicNo" name="fssaiLicNo" maxLength={14} defaultValue={product!.fssaiLicNo ?? ""} placeholder="14-digit number" />
                  </div>
                </div>
              </fieldset>

              <fieldset className="vh-field" style={{ border: 0, padding: 0, margin: "16px 0 0" }}>
                <legend className="vh-label">Delivery for this product</legend>
                <div className="vh-grid" style={{ gap: 6, marginTop: 4 }}>
                  <label className="vh-row" style={{ gap: 8, fontSize: ".9rem" }}>
                    <input type="radio" name="shippingMode" value="" defaultChecked={!product!.shippingMode} />
                    Use the standard delivery rates (by weight &amp; area)
                  </label>
                  <label className="vh-row" style={{ gap: 8, fontSize: ".9rem" }}>
                    <input type="radio" name="shippingMode" value="FREE" defaultChecked={product!.shippingMode === "FREE"} />
                    Free delivery on this product
                  </label>
                  <label className="vh-row" style={{ gap: 8, fontSize: ".9rem", alignItems: "center", flexWrap: "wrap" }}>
                    <input type="radio" name="shippingMode" value="FLAT" defaultChecked={product!.shippingMode === "FLAT"} />
                    Flat delivery fee of
                    <input className="vh-input mono" name="shippingFlatPaise" type="number" min={1} max={100000} defaultValue={product!.shippingFlatPaise ?? ""} placeholder="4900" style={{ width: 120 }} aria-label="Flat delivery fee in paise" />
                    <span className="small muted">paise (e.g. 4900 = ₹49)</span>
                  </label>
                </div>
                <span className="vh-help">A flat fee replaces the standard delivery charge for this item. Orders over the free-delivery threshold still ship free.</span>
              </fieldset>
            </div>
          </Card>

          {/* Sale price — a temporary discount off the regular price */}
          <Card title="Put it on sale" action={onSale ? <StatusPill tone="warn">On sale now</StatusPill> : <span className="small muted">Optional</span>}>
            <div className="vh-grid" style={{ gap: 16 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="salePricePaise">Sale price (paise)</label>
                <input className="vh-input" id="salePricePaise" name="salePricePaise" type="number" min={0} defaultValue={product!.salePricePaise ?? ""} placeholder="lower than the selling price" />
                <span className="vh-help">Leave blank for no sale. Must be below your selling price of <MoneyText paise={product!.pricePaise} />. Buyers see the old price struck through.</span>
              </div>
              <div className="vh-grid cols-2" style={{ gap: 16 }}>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="saleFrom">Starts (optional)</label>
                  <input className="vh-input" id="saleFrom" name="saleFrom" type="date" defaultValue={product!.saleFrom ?? ""} />
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="saleTo">Ends (optional)</label>
                  <input className="vh-input" id="saleTo" name="saleTo" type="date" defaultValue={product!.saleTo ?? ""} />
                </div>
              </div>
            </div>
          </Card>

          {/* SEO — how the listing appears on Google and shared links */}
          <Card title="Search visibility (SEO)" action={<span className="small muted">How it shows on Google</span>}>
            <div className="vh-grid" style={{ gap: 16 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="metaTitle">Page title</label>
                <input className="vh-input" id="metaTitle" name="metaTitle" maxLength={70} defaultValue={product!.metaTitle ?? ""} placeholder={product!.title} />
                <span className="vh-help">Up to 70 characters. Leave blank to use the product title.</span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="metaDescription">Page description</label>
                <input className="vh-input" id="metaDescription" name="metaDescription" maxLength={160} defaultValue={product!.metaDescription ?? ""} placeholder="A short line that appears under the title in search results." />
                <span className="vh-help">Up to 160 characters.</span>
              </div>
            </div>
          </Card>

          <button className="vh-btn vh-btn-primary" type="submit" style={{ justifySelf: "start" }}>Save changes</button>
        </form>

        {/* Photos — a real gallery (each control is its own small form) */}
        <div id="gallery" style={{ scrollMarginTop: 90 }}>
          <Card title="Photos" action={<span className="small muted">{images.length}/6 · first is the main photo</span>}>
            {images.length > 0 ? (
              <div className="vh-grid cols-4" style={{ gap: 8, marginBottom: 12 }}>
                {images.map((src, i) => (
                  <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: "var(--vh-radius-sm)", overflow: "hidden", border: i === 0 ? "2px solid var(--vh-accent)" : "1px solid var(--vh-line)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`${product!.title} photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {i === 0 && <span className="vh-pill vh-pill-ok" style={{ position: "absolute", top: 4, left: 4, fontSize: ".65rem" }}>Main</span>}
                    <div style={{ position: "absolute", bottom: 4, right: 4, display: "flex", gap: 4 }}>
                      {i !== 0 && (
                        <form action={setMainProductImage}>
                          <input type="hidden" name="productId" value={product!.id} />
                          <input type="hidden" name="index" value={i} />
                          <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit" title="Make main photo" aria-label={`Make photo ${i + 1} the main photo`}><Star size={12} strokeWidth={2.2} aria-hidden /></button>
                        </form>
                      )}
                      <form action={deleteProductImage}>
                        <input type="hidden" name="productId" value={product!.id} />
                        <input type="hidden" name="index" value={i} />
                        <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit" title="Remove photo" aria-label={`Remove photo ${i + 1}`}><Trash2 size={12} strokeWidth={2.2} aria-hidden /></button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="small muted" style={{ marginTop: 0 }}>No photos yet. Add clear pack shots on a plain background — they lift clicks and sales.</p>
            )}
            {images.length < 6 && (
              <form action={uploadProductImage} className="vh-row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input type="hidden" name="productId" value={product!.id} />
                <label className="vh-btn vh-btn-sm vh-btn-ghost vh-row" style={{ gap: 6, cursor: "pointer" }}>
                  <ImagePlus size={14} strokeWidth={2.2} aria-hidden /> Choose photo
                  <input type="file" name="image" accept="image/*" required style={{ display: "none" }} />
                </label>
                <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Upload</button>
                <span className="small muted">JPG, PNG, WEBP or SVG · under 1.5&nbsp;MB</span>
              </form>
            )}
            <p className="small muted" style={{ margin: "10px 0 0" }}>Pack shots only — imagery implying medical outcomes fails the creative review.</p>
          </Card>
        </div>

        {/* Duplicate — clone as a fresh draft */}
        <Card title="Duplicate this product">
          <div className="vh-row-between" style={{ gap: 12, flexWrap: "wrap" }}>
            <p className="small muted" style={{ margin: 0, maxWidth: 360 }}>
              Make a copy to sell a similar product without starting from scratch. The copy is a new draft with no stock and no lab report yet.
            </p>
            <form action={duplicateProduct}>
              <input type="hidden" name="productId" value={product!.id} />
              <button className="vh-btn vh-btn-sm vh-btn-ghost vh-row" style={{ gap: 6 }} type="submit"><Copy size={14} strokeWidth={2.2} aria-hidden /> Make a copy</button>
            </form>
          </div>
        </Card>
        </div>

        {/* ── Right rail: lifecycle, CoA, batches ───────────── */}
        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card title="Listing lifecycle">
            <div className="vh-row-between" style={{ marginBottom: 12 }}>
              <span className="small muted">Current state</span>
              <StatusPill tone={toneForStatus(product!.status)}>{product!.status.replace(/_/g, " ")}</StatusPill>
            </div>
            {regulated && (
              <div className="vh-row-between" style={{ marginBottom: 12 }}>
                <span className="small muted">CoA gate</span>
                <StatusPill tone={product!.coaState === "APPROVED" ? "ok" : "danger"}>
                  {product!.coaState === "APPROVED" ? `Open — batch ${product!.batchCode}` : `Closed — ${product!.coaState.replace(/_/g, " ").toLowerCase()}`}
                </StatusPill>
              </div>
            )}

            <div className="vh-grid" style={{ gap: 8 }}>
              {product!.status === "DRAFT" && lifecycleBtn("submit", "Submit for review", Send, "vh-btn-primary")}
              {product!.status === "UNDER_REVIEW" && (
                <p className="small muted" style={{ margin: 0 }}>
                  In the review queue. A human reviewer approves every listing — regulated classes only pass once the batch CoA is APPROVED.
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
                      Must state the exact batch code. Compliance reviews every submission (SLA ~4h) — no bulk approval, no override.
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

      {/* ── Variants (size / pack / strength options) ─────── */}
      <div id="variants" style={{ scrollMarginTop: 90, marginTop: "var(--sp-4)" }}>
        <Card
          title="Variants (size / pack / strength)"
          action={<span className="small muted">{hasVariants(product!) ? `${product!.variants!.length} option${product!.variants!.length === 1 ? "" : "s"}` : "Optional"}</span>}
        >
          {vdone && <div style={{ marginBottom: 12 }}><Banner severity="ok" title="Variants updated">The product page shows the options immediately; the listing price becomes the lowest variant price.</Banner></div>}
          {err?.startsWith("v_") && <div style={{ marginBottom: 12 }}><Banner severity="danger" title="Couldn't add that variant">{err === "v_dupe" ? "That option label already exists." : err === "v_mrp" ? "MRP must be an integer in paise, at or above the price." : err === "v_price" ? "Price must be a positive integer in paise." : "Check the variant fields."}</Banner></div>}
          {err === "optionname" && <div style={{ marginBottom: 12 }}><Banner severity="danger" title="Option name required">Give the option group a name (e.g. Size, Pack, Strength).</Banner></div>}

          <p className="small muted" style={{ marginTop: 0 }}>
            Add options like 250&nbsp;g / 500&nbsp;g / 1&nbsp;kg or 500&nbsp;mg / 1000&nbsp;mg. Each option has its own
            price, MRP and stock; buyers pick one on the product page and the cart, checkout and inventory all follow it.
          </p>

          {/* Option name */}
          <form action={saveOptionName} className="vh-row" style={{ gap: 10, alignItems: "flex-end", marginBottom: "var(--sp-3)", flexWrap: "wrap" }}>
            <input type="hidden" name="productId" value={product!.id} />
            <div className="vh-field" style={{ maxWidth: 220 }}>
              <label className="vh-label" htmlFor="optName">Option name</label>
              <input className="vh-input" id="optName" name="optionName" maxLength={30} defaultValue={product!.optionName ?? ""} placeholder="Size / Pack / Strength" />
            </div>
            <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Save name</button>
          </form>

          {/* Existing variants — edit price/stock inline */}
          {hasVariants(product!) && (
            <div style={{ display: "grid", gap: 8, marginBottom: "var(--sp-3)" }}>
              {product!.variants!.map((v) => (
                <div key={v.id} className="vh-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end", borderTop: "1px solid var(--vh-line)", paddingTop: 8 }}>
                  <div style={{ minWidth: 120 }}>
                    <div style={{ fontWeight: 700 }}>{v.label}</div>
                    <div className="small muted mono">{v.sku}</div>
                  </div>
                  <form action={updateProductVariant} className="vh-row" style={{ gap: 6, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <input type="hidden" name="productId" value={product!.id} />
                    <input type="hidden" name="variantId" value={v.id} />
                    <label className="small">Price<input className="vh-input" name="pricePaise" type="number" defaultValue={v.pricePaise} style={{ width: 100 }} aria-label={`Price for ${v.label}`} /></label>
                    <label className="small">MRP<input className="vh-input" name="mrpPaise" type="number" defaultValue={v.mrpPaise} style={{ width: 100 }} aria-label={`MRP for ${v.label}`} /></label>
                    <label className="small">Stock<input className="vh-input" name="stockQty" type="number" defaultValue={v.stockQty} style={{ width: 80 }} aria-label={`Stock for ${v.label}`} /></label>
                    <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Save</button>
                  </form>
                  <form action={removeProductVariant} style={{ display: "inline-flex" }}>
                    <input type="hidden" name="productId" value={product!.id} />
                    <input type="hidden" name="variantId" value={v.id} />
                    <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit" aria-label={`Remove ${v.label}`}><Trash2 size={13} strokeWidth={2.2} aria-hidden /></button>
                  </form>
                </div>
              ))}
            </div>
          )}

          {/* Add a variant */}
          <form action={addProductVariant} className="vh-row" style={{ gap: 8, alignItems: "flex-end", flexWrap: "wrap", borderTop: "1px solid var(--vh-line)", paddingTop: "var(--sp-3)" }}>
            <input type="hidden" name="productId" value={product!.id} />
            <label className="small">Label<input className="vh-input" name="label" maxLength={30} placeholder="500 g" style={{ width: 110 }} required aria-label="New variant label" /></label>
            <label className="small">SKU<input className="vh-input mono" name="sku" maxLength={30} placeholder="auto" style={{ width: 110 }} aria-label="New variant SKU" /></label>
            <label className="small">Price (paise)<input className="vh-input" name="pricePaise" type="number" min={1} placeholder="89900" style={{ width: 110 }} required aria-label="New variant price" /></label>
            <label className="small">MRP (paise)<input className="vh-input" name="mrpPaise" type="number" min={1} placeholder="109900" style={{ width: 110 }} required aria-label="New variant MRP" /></label>
            <label className="small">Stock<input className="vh-input" name="stockQty" type="number" min={0} placeholder="40" style={{ width: 80 }} required aria-label="New variant stock" /></label>
            <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Add variant</button>
          </form>
        </Card>
      </div>

      {/* ── Wholesale / B2B price breaks ──────────────────── */}
      <div id="wholesale" style={{ scrollMarginTop: 90, marginTop: "var(--sp-4)" }}>
        <Card
          title="Wholesale (bulk) pricing"
          action={<span className="small muted">{(product!.wholesaleTiers ?? []).length} tier{(product!.wholesaleTiers ?? []).length === 1 ? "" : "s"}</span>}
        >
          {wdone && <div style={{ marginBottom: 12 }}><Banner severity="ok" title="Wholesale pricing updated">Approved business buyers automatically get this price at the cart once they reach the quantity.</Banner></div>}
          {err?.startsWith("w_") && <div style={{ marginBottom: 12 }}><Banner severity="danger" title="Couldn't add that tier">{err === "w_qty" ? "The minimum quantity must be 2 or more." : err === "w_price" ? "The wholesale price must be a positive amount below your selling price." : "Check the tier fields."}</Banner></div>}

          <p className="small muted" style={{ marginTop: 0 }}>
            Offer a lower per-unit price to <strong>approved business accounts</strong> who buy in bulk (clinics,
            resellers, studios). Regular shoppers always pay the normal price. Applied server-side at the cart.
          </p>

          {(product!.wholesaleTiers ?? []).length > 0 && (
            <div style={{ display: "grid", gap: 8, marginBottom: "var(--sp-3)" }}>
              {product!.wholesaleTiers!.map((t) => (
                <div key={t.minQty} className="vh-row" style={{ gap: 12, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--vh-line)", paddingTop: 8 }}>
                  <span style={{ fontWeight: 700, minWidth: 120 }}>Buy {t.minQty}+</span>
                  <span><MoneyText paise={t.pricePaise} /> <span className="small muted">/ unit</span></span>
                  <span className="small muted">(vs <MoneyText paise={product!.pricePaise} />)</span>
                  <form action={removeWholesaleTierAction} style={{ marginLeft: "auto" }}>
                    <input type="hidden" name="productId" value={product!.id} />
                    <input type="hidden" name="minQty" value={t.minQty} />
                    <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit" aria-label={`Remove ${t.minQty}+ tier`}><Trash2 size={13} strokeWidth={2.2} aria-hidden /></button>
                  </form>
                </div>
              ))}
            </div>
          )}

          <form action={addWholesaleTierAction} className="vh-row" style={{ gap: 8, alignItems: "flex-end", flexWrap: "wrap", borderTop: "1px solid var(--vh-line)", paddingTop: "var(--sp-3)" }}>
            <input type="hidden" name="productId" value={product!.id} />
            <label className="small">Min quantity<input className="vh-input" name="minQty" type="number" min={2} placeholder="10" style={{ width: 110 }} required aria-label="Minimum quantity" /></label>
            <label className="small">Price per unit (paise)<input className="vh-input" name="pricePaise" type="number" min={1} placeholder="lower than the selling price" style={{ width: 200 }} required aria-label="Wholesale unit price" /></label>
            <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Add tier</button>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
