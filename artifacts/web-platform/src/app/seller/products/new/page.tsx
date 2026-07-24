/**
 * VEDIC HEMP — ADD PRODUCT (§2.3)
 *
 * Visual create-product form. Compliance class selection is gated by the
 * seller's licences and capability matrix — a class the seller isn't
 * licensed for is shown locked with remediation, not hidden, so the seller
 * understands what to do next. CBD requires an AYUSH licence AND a batch CoA
 * before it can ever go live (A2); MED_CANNABIS is rendered permanently
 * disabled (A1 — it is never advertisable/promotable anywhere, and requires
 * a State Drug licence + pharmacist infrastructure this store does not hold).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Lock, ArrowRight, FileUp } from "lucide-react";
import { Shell } from "../../Shell";
import { Banner, Card, StatusPill } from "@/components/ui";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { sellerData } from "../../_lib/data";
import { actingStore } from "../../_lib/store";
import { CLASS_META } from "@/lib/compliance";
import { submitProduct } from "../../actions";

export const metadata: Metadata = { title: "Add product" };

const STEPS = ["Details", "Compliance", "Pricing", "Media"] as const;
const ACTIVE_STEP = 0;

const LICENCE_REMEDIATION: Record<string, { label: string; href: string }> = {
  FSSAI: { label: "Add FSSAI licence", href: "/seller/store#licences" },
  AYUSH: { label: "Add AYUSH licence", href: "/seller/store#licences" },
  STATE_DRUG: { label: "About State Drug licensing", href: "/seller/store#licences" },
};

const SUBMIT_ERRORS: Record<string, string> = {
  cls: "Pick a compliance class you're licensed for.",
  title: "Title should be 8–150 characters — product + format + size.",
  claims: "The copy-check rejected claims language (cure/treat/prevent/heal). Describe composition and traditional use instead.",
  price: "Selling price must be a positive integer in paise.",
  mrp: "MRP must be an integer in paise, and the selling price cannot exceed it.",
  hsn: "HSN code should be 4–8 digits.",
  fssai: "An FSSAI licence number is exactly 14 digits.",
  shelf: "Shelf life should be a whole number of months (0–120).",
};

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
  const { CAPABILITY_MATRIX } = sellerData(await actingStore());
  return (
    <Shell active="/seller/products" breadcrumb={["Seller Central", "Products", "Add product"]} title="Add product">
      {/* Step indicator */}
      <nav className="vh-seg" aria-label="Add product steps" style={{ marginBottom: "var(--sp-4)" }}>
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={i === ACTIVE_STEP ? "on" : undefined}
            aria-current={i === ACTIVE_STEP ? "step" : undefined}
            style={{ fontSize: ".82rem", fontWeight: 700, padding: "6px 13px", borderRadius: 8, color: i === ACTIVE_STEP ? "var(--vh-ink)" : "var(--vh-muted)" }}
          >
            <span className="tabular" aria-hidden>{i + 1}.</span> {s}
          </span>
        ))}
      </nav>

      {err && SUBMIT_ERRORS[err] && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger" title="Fix this before submitting">{SUBMIT_ERRORS[err]}</Banner>
        </div>
      )}

      <form action={submitProduct} className="vh-grid cols-2" style={{ alignItems: "start" }}>
        {/* Class picker */}
        <Card title="Choose a compliance class">
          <p className="small muted" style={{ marginTop: 0 }}>
            The class you pick drives everything downstream — pricing rules, required licence, CoA requirements,
            shipping and whether the product may ever be advertised.
          </p>
          <div className="vh-grid" style={{ gap: 8 }} role="radiogroup" aria-label="Compliance class">
            {CAPABILITY_MATRIX.filter((r) => r.cls !== "MED_CANNABIS").map((row) => {
              const meta = CLASS_META[row.cls];
              const locked = row.capability === "LOCKED";
              const remediation = LICENCE_REMEDIATION[row.requiredLicence];
              return (
                <label
                  key={row.cls}
                  style={{
                    display: "block", border: `1px solid ${locked ? "var(--vh-line)" : "var(--vh-line-strong)"}`,
                    borderRadius: "var(--vh-radius-sm)", padding: 16,
                    background: locked ? "var(--vh-bg-subtle)" : "var(--vh-surface)",
                    cursor: locked ? "not-allowed" : "pointer",
                  }}
                >
                  <span className="vh-row-between" style={{ alignItems: "flex-start" }}>
                    <span className="vh-row" style={{ gap: 10, alignItems: "flex-start" }}>
                      <input type="radio" name="cls" value={row.cls} disabled={locked} required aria-label={meta.label} style={{ marginTop: 4 }} />
                      <span>
                        <span style={{ fontWeight: 700, display: "block", opacity: locked ? 0.65 : 1 }}>
                          <span aria-hidden>{meta.emoji}</span> {meta.label}
                        </span>
                        <span className="small muted" style={{ display: "block", marginTop: 2 }}>{row.note}</span>
                        {locked && remediation && (
                          <Link className="small" href={remediation.href} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontWeight: 700 }}>
                            {remediation.label} <ArrowRight size={13} strokeWidth={2.4} aria-hidden />
                          </Link>
                        )}
                      </span>
                    </span>
                    <StatusPill tone={locked ? "neutral" : row.capability === "ACTIVE_RENEW" ? "warn" : "ok"}>
                      {locked ? "Locked" : row.capability === "ACTIVE_RENEW" ? "Licensed — renew soon" : "Licensed"}
                    </StatusPill>
                  </span>
                </label>
              );
            })}

            {/* MED_CANNABIS — permanently disabled card, never selectable */}
            {(() => {
              const row = CAPABILITY_MATRIX.find((r) => r.cls === "MED_CANNABIS");
              if (!row) return null;
              const meta = CLASS_META[row.cls];
              return (
                <div
                  aria-disabled="true"
                  style={{
                    border: "1px solid color-mix(in srgb, var(--vh-danger) 40%, var(--vh-line))",
                    borderRadius: "var(--vh-radius-sm)", padding: 16,
                    background: "color-mix(in srgb, var(--vh-danger-bg) 35%, var(--vh-surface))",
                  }}
                >
                  <div className="vh-row-between" style={{ alignItems: "flex-start" }}>
                    <span className="vh-row" style={{ gap: 10, alignItems: "flex-start" }}>
                      <Lock size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-danger)", marginTop: 4 }} />
                      <span>
                        <span style={{ fontWeight: 700, display: "block" }}>
                          <span aria-hidden>{meta.emoji}</span> {meta.label}
                        </span>
                        <span className="small muted" style={{ display: "block", marginTop: 2 }}>
                          Requires a State Drug licence plus a registered pharmacist and Rx dispensing infrastructure.
                          Prescription-only if ever listed — and never advertisable or promotable, by anyone, ever,
                          regardless of licence.
                        </span>
                      </span>
                    </span>
                    <StatusPill tone="danger">Not selectable</StatusPill>
                  </div>
                </div>
              );
            })()}
          </div>
        </Card>

        {/* Details form + CoA note */}
        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card title="Product details">
            <div className="vh-grid" style={{ gap: 16 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="title">Title <span className="req">*</span></label>
                <input className="vh-input" id="title" name="title" type="text" maxLength={150} placeholder="e.g. CBD Wellness Balm 30g" />
                <span className="vh-help">0/150 · Product + format + size. Claims language is rejected by the copy-check.</span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="desc">Description</label>
                <RichTextEditor
                  name="desc"
                  id="desc"
                  maxLength={2000}
                  minHeight={140}
                  placeholder="Composition, format and traditional use — no disease or cure claims."
                  help="Wellness copy describes composition and traditional use only (Drugs & Magic Remedies Act)."
                />
              </div>
              <div className="vh-grid cols-2" style={{ gap: 16 }}>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="price">Selling price (paise) <span className="req">*</span></label>
                  <input className="vh-input" id="price" name="pricePaise" type="number" min={0} step={1} placeholder="149900" />
                  <span className="vh-help">Enter in paise: ₹1,499 = 149900.</span>
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="mrp">MRP (paise) <span className="req">*</span></label>
                  <input className="vh-input" id="mrp" name="mrpPaise" type="number" min={0} step={1} placeholder="199900" />
                  <span className="vh-help">Price can&rsquo;t be higher than MRP.</span>
                </div>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="hsn">HSN code <span className="req">*</span></label>
                <input className="vh-input mono" id="hsn" name="hsn" type="text" maxLength={8} placeholder="33049910" />
                <span className="vh-help">0/8 · Determines the GST rate on every invoice line.</span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="stockQty">Opening stock (units)</label>
                <input className="vh-input" id="stockQty" name="stockQty" type="number" min={0} step={1} defaultValue={25} placeholder="25" />
                <span className="vh-help">On-hand units once live. Adjust any time in Inventory; zero means out of stock.</span>
              </div>
            </div>
          </Card>

          <Card title="Product label & specification">
            <p className="small muted" style={{ marginTop: 0 }}>
              The facts a buyer expects on a regulated Indian product. These render as the specification table on the
              listing — they are label facts, not marketing. The claims check still applies: no field may claim to
              cure, treat or prevent anything.
            </p>
            <div className="vh-grid cols-2" style={{ gap: 12 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="netQuantity">Net quantity</label>
                <input className="vh-input" id="netQuantity" name="netQuantity" type="text" maxLength={60} placeholder="30 g · 250 ml · 60 capsules" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="marketer">Marketed by</label>
                <input className="vh-input" id="marketer" name="marketer" type="text" maxLength={120} placeholder="Brand name, city" />
              </div>
              <div className="vh-field" style={{ gridColumn: "1 / -1" }}>
                <label className="vh-label" htmlFor="ingredients">Ingredients / composition</label>
                <textarea className="vh-textarea" id="ingredients" name="ingredients" rows={2} maxLength={500} placeholder="Key actives and full ingredient list" />
              </div>
              <div className="vh-field" style={{ gridColumn: "1 / -1" }}>
                <label className="vh-label" htmlFor="directions">Directions for use <span className="muted small">(Ayurveda / CBD)</span></label>
                <textarea className="vh-textarea" id="directions" name="directions" rows={2} maxLength={300} placeholder="How to use — dosage, frequency. No disease claims." />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="storage">Storage</label>
                <input className="vh-input" id="storage" name="storage" type="text" maxLength={160} placeholder="Store in a cool, dry place away from sunlight" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="countryOfOrigin">Country of origin</label>
                <input className="vh-input" id="countryOfOrigin" name="countryOfOrigin" type="text" maxLength={60} defaultValue="India" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="shelfLifeMonths">Shelf life (months)</label>
                <input className="vh-input" id="shelfLifeMonths" name="shelfLifeMonths" type="number" min={0} max={120} step={1} placeholder="24" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="fssaiLicNo">FSSAI licence no. <span className="muted small">(food only)</span></label>
                <input className="vh-input mono" id="fssaiLicNo" name="fssaiLicNo" type="text" maxLength={14} placeholder="14-digit number" />
              </div>
            </div>
          </Card>

          <Card title="Batch & CoA — required before publish">
            <div className="vh-row" style={{ alignItems: "flex-start", gap: 10 }}>
              <FileUp size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)", marginTop: 2, flexShrink: 0 }} />
              <p className="small muted" style={{ margin: 0 }}>
                A regulated product is created in DRAFT. It stays invisible to buyers until you add at least one batch
                with an approved lab report matching the batch — there is no way to skip this step, no
                bulk approval, and no override.
              </p>
            </div>
          </Card>

          <div className="vh-row" style={{ gap: 8 }}>
            <button className="vh-btn vh-btn-primary" type="submit" name="intent" value="submit" style={{ flex: 1 }}>
              Submit for review
            </button>
            <button className="vh-btn vh-btn-ghost" type="submit" name="intent" value="draft">Save as draft</button>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            We check everything when you submit. Submitted listings show as Under review;
            regulated classes still need an approved, batch-matched CoA before they can go live.
          </p>
        </div>
      </form>
    </Shell>
  );
}
