/**
 * VEDIC HEMP — IMPORT RULES.
 *
 * The default business rules applied to every import: pricing transforms
 * (markup/discount, paise rounding, margin floor, discount cap, auto tags and
 * classes) and catalogue filters (active-only, skip drafts/archived/out-of-stock,
 * require an image). Money stays integer paise end to end — percentages here only
 * transform prices, they never carry a rupee amount. These rules shape what lands,
 * not what sells: every import arrives as DRAFT, and regulated products stay gated
 * regardless of anything set here — a CBD product cannot sell until its lab report
 * is approved (A2), and Medical Cannabis is never imported at all (A1). Rules can
 * be overridden per-run in the import wizard.
 */

import type { Metadata } from "next";
import { SlidersHorizontal, IndianRupee, Filter, Save } from "lucide-react";
import { Shell } from "@/app/admin/Shell";
import { ImpShell, ImpHero } from "@/app/admin/import/_ui";
import { Card } from "@/components/ui";
import { getRules } from "@/lib/import/store";
import { saveRulesAction } from "@/app/admin/import/actions";

export const metadata: Metadata = { title: "Import Rules" };
export const dynamic = "force-dynamic";

export default async function ImportRulesPage() {
  const rules = await getRules();

  return (
    <Shell active="/admin/import/rules" breadcrumb={["Admin", "Marketplace", "Import"]} title="Import Rules">
      <ImpShell>
        <ImpHero
          badge="Rules"
          title="Import rules"
          sub="Default business rules applied to every import. Money stays in paise; regulated products are always gated regardless of these settings — imports land as DRAFT and a CBD product cannot sell until its lab report is approved."
        />

        <Card title={<span className="vh-row" style={{ gap: 8 }}><SlidersHorizontal size={16} aria-hidden /> Default rules</span>}>
          <form action={saveRulesAction} style={{ display: "grid", gap: "var(--sp-4)" }}>
            <div className="imp-grid cols-2">
              {/* LEFT — pricing */}
              <div style={{ display: "grid", gap: "var(--sp-4)", alignContent: "start" }}>
                <h4 className="vh-row" style={{ gap: 8, margin: 0 }}>
                  <IndianRupee size={15} aria-hidden /> Pricing
                </h4>

                <label style={{ display: "grid", gap: 6 }}>
                  <span className="small muted">Adjust price by %</span>
                  <input
                    type="number"
                    name="priceAdjustPct"
                    className="vh-input tabular"
                    step="0.1"
                    defaultValue={rules.priceAdjustPct}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span className="small muted">Round price to</span>
                  <select name="roundTo" className="vh-input" defaultValue={rules.roundTo ?? 0}>
                    <option value={0}>No rounding</option>
                    <option value={100}>Nearest ₹1</option>
                    <option value={1000}>Nearest ₹10</option>
                    <option value={10000}>Nearest ₹100</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span className="small muted">Minimum margin % over cost</span>
                  <input
                    type="number"
                    name="minMarginPct"
                    className="vh-input tabular"
                    step="0.1"
                    placeholder="No floor"
                    defaultValue={rules.minMarginPct ?? ""}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span className="small muted">Max discount %</span>
                  <input
                    type="number"
                    name="maxDiscountPct"
                    className="vh-input tabular"
                    step="0.1"
                    placeholder="No cap"
                    defaultValue={rules.maxDiscountPct ?? ""}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span className="small muted">Auto-add tags (comma-separated)</span>
                  <input
                    type="text"
                    name="autoTags"
                    className="vh-input"
                    placeholder="imported, new-arrival"
                    defaultValue={rules.autoTags.join(", ")}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span className="small muted">Auto shipping class</span>
                  <input
                    type="text"
                    name="autoShippingClass"
                    className="vh-input"
                    placeholder="Standard"
                    defaultValue={rules.autoShippingClass ?? ""}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span className="small muted">Auto tax class</span>
                  <input
                    type="text"
                    name="autoTaxClass"
                    className="vh-input"
                    placeholder="GST 18%"
                    defaultValue={rules.autoTaxClass ?? ""}
                  />
                </label>
              </div>

              {/* RIGHT — filters */}
              <div style={{ display: "grid", gap: "var(--sp-4)", alignContent: "start" }}>
                <h4 className="vh-row" style={{ gap: 8, margin: 0 }}>
                  <Filter size={15} aria-hidden /> Filters
                </h4>

                <label className="vh-row" style={{ gap: 8, alignItems: "flex-start" }}>
                  <input type="checkbox" name="onlyActive" defaultChecked={rules.onlyActive} style={{ marginTop: 3 }} />
                  <span className="small">Only import active products</span>
                </label>

                <label className="vh-row" style={{ gap: 8, alignItems: "flex-start" }}>
                  <input type="checkbox" name="skipDrafts" defaultChecked={rules.skipDrafts} style={{ marginTop: 3 }} />
                  <span className="small">Skip drafts</span>
                </label>

                <label className="vh-row" style={{ gap: 8, alignItems: "flex-start" }}>
                  <input type="checkbox" name="skipArchived" defaultChecked={rules.skipArchived} style={{ marginTop: 3 }} />
                  <span className="small">Skip archived</span>
                </label>

                <label className="vh-row" style={{ gap: 8, alignItems: "flex-start" }}>
                  <input type="checkbox" name="skipOutOfStock" defaultChecked={rules.skipOutOfStock} style={{ marginTop: 3 }} />
                  <span className="small">Skip out-of-stock</span>
                </label>

                <label className="vh-row" style={{ gap: 8, alignItems: "flex-start" }}>
                  <input type="checkbox" name="requireImage" defaultChecked={rules.requireImage} style={{ marginTop: 3 }} />
                  <span className="small">Only import products with an image</span>
                </label>

                <div className="vh-banner vh-banner-info" style={{ marginTop: "var(--sp-2)" }}>
                  <span className="small">
                    Filters decide what lands; they never decide what sells. Everything imported
                    arrives as DRAFT, and regulated classes stay gated — a CBD batch waits on an
                    approved lab report (A2) and Medical Cannabis is never imported (A1).
                  </span>
                </div>
              </div>
            </div>

            <button type="submit" className="vh-btn vh-btn-primary vh-row" style={{ width: "100%", justifyContent: "center", gap: 8 }}>
              <Save size={16} aria-hidden /> Save rules
            </button>
          </form>

          <p className="small muted" style={{ marginTop: "var(--sp-4)" }}>
            These rules apply to every import. Any of them can be overridden per-run in the import wizard.
          </p>
        </Card>
      </ImpShell>
    </Shell>
  );
}
