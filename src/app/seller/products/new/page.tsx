/**
 * VEDIC HEMP — ADD PRODUCT (§2.3)
 *
 * Visual create-product form. Compliance class selection is gated by the
 * seller's licences and capability matrix — a class the seller isn't
 * licensed for is shown locked, not hidden, so the seller understands what
 * to do next. CBD requires an AYUSH licence AND a batch CoA before it can
 * ever go live (A2); MED_CANNABIS is not offered here at all (A1 — no seller
 * UI presents it as advertisable/promotable, and it requires a State Drug
 * licence this seller does not hold).
 */

import type { Metadata } from "next";
import { Shell } from "../../Shell";
import { Card, Banner, StatusPill } from "@/components/ui";
import { CAPABILITY_MATRIX } from "../../_lib/data";
import { CLASS_META } from "@/lib/compliance";

export const metadata: Metadata = { title: "Add product" };

export default function NewProductPage() {
  return (
    <Shell active="/seller/products" breadcrumb={["Seller Central", "Products", "Add product"]} title="Add product">
      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <Card title="1. Choose a compliance class">
          <p className="small muted" style={{ marginTop: 0 }}>
            The class you pick drives everything downstream — pricing rules, required licence, CoA requirements,
            shipping and whether the product may ever be advertised.
          </p>
          <div className="vh-grid" style={{ gap: 10 }}>
            {CAPABILITY_MATRIX.map((row) => {
              const meta = CLASS_META[row.cls];
              const locked = row.capability === "LOCKED";
              return (
                <label
                  key={row.cls}
                  className="vh-row-between"
                  style={{
                    border: "1px solid var(--vh-line)", borderRadius: 10, padding: 12,
                    opacity: locked ? 0.6 : 1, cursor: locked ? "not-allowed" : "pointer",
                  }}
                >
                  <span className="vh-row" style={{ gap: 10 }}>
                    <input type="radio" name="cls" value={row.cls} disabled={locked} aria-label={meta.label} />
                    <span>
                      <div style={{ fontWeight: 600 }}>{meta.emoji} {meta.label}</div>
                      <div className="small muted">{row.note}</div>
                    </span>
                  </span>
                  <StatusPill tone={locked ? "neutral" : row.capability === "ACTIVE_RENEW" ? "warn" : "ok"}>
                    {locked ? "Locked" : row.capability === "ACTIVE_RENEW" ? "Licensed — renew soon" : "Licensed"}
                  </StatusPill>
                </label>
              );
            })}
          </div>
          <Banner severity="info" title="Medical Cannabis is never offered here" icon="⛔" >
            <span className="small">This form never presents MED_CANNABIS as a selectable class — it cannot be advertised or promoted by anyone,
            ever (A1), and requires a State Drug licence plus dispensing infrastructure this store does not hold.</span>
          </Banner>
        </Card>

        <div className="vh-grid" style={{ gap: 18 }}>
          <Card title="2. Product details">
            <div className="vh-grid" style={{ gap: 12 }}>
              <div>
                <label className="small muted" htmlFor="title">Title</label>
                <input id="title" name="title" type="text" placeholder="e.g. CBD Wellness Balm 30g" style={{ width: "100%", padding: 8, border: "1px solid var(--vh-line)", borderRadius: 8 }} />
              </div>
              <div className="vh-grid cols-2">
                <div>
                  <label className="small muted" htmlFor="price">Selling price (₹)</label>
                  <input id="price" name="price" type="number" min={0} step="0.01" style={{ width: "100%", padding: 8, border: "1px solid var(--vh-line)", borderRadius: 8 }} />
                </div>
                <div>
                  <label className="small muted" htmlFor="mrp">MRP (₹)</label>
                  <input id="mrp" name="mrp" type="number" min={0} step="0.01" style={{ width: "100%", padding: 8, border: "1px solid var(--vh-line)", borderRadius: 8 }} />
                </div>
              </div>
              <div>
                <label className="small muted" htmlFor="hsn">HSN code</label>
                <input id="hsn" name="hsn" type="text" style={{ width: "100%", padding: 8, border: "1px solid var(--vh-line)", borderRadius: 8 }} />
              </div>
            </div>
          </Card>

          <Card title="3. Batch & CoA (required before publish)">
            <p className="small muted" style={{ marginTop: 0 }}>
              A regulated product is created in DRAFT. It stays invisible to buyers until you add at least one batch
              with an APPROVED, batch-matched Certificate of Analysis — there is no way to skip this step (A2).
            </p>
            <a className="vh-btn vh-btn-sm vh-btn-ghost" href="#">Add batch after saving</a>
          </Card>

          <button className="vh-btn vh-btn-primary" type="button" style={{ width: "100%" }}>
            Save as draft
          </button>
        </div>
      </div>
    </Shell>
  );
}
