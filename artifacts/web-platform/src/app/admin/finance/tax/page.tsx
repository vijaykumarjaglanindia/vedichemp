/**
 * VEDIC HEMP — GST RATE TABLE (admin)
 *
 * The slabs the platform charges. Every row carries its own date of effect, so
 * changing a rate does not restate history: a reprinted invoice is raised at the
 * slab that was in force on its order date (gstRateBps takes an as-of date). An
 * HSN-prefix row wins over the compliance-class fallback, longest prefix first.
 *
 * Prices on the platform are GST-INCLUSIVE, so a slab change moves the tax split
 * on an invoice, never the price a buyer was quoted. Nothing here is a compliance
 * gate — it is the operator's tax configuration, and every save is audited.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Percent, Plus, Info } from "lucide-react";
import { Shell } from "../../Shell";
import { Banner, Card, StatusPill } from "@/components/ui";
import { readTaxRates, GST_FALLBACK_BPS, type GstRate } from "@/lib/tax";
import { saveTaxRates } from "../../actions";

export const metadata: Metadata = { title: "GST rates · Admin" };
export const dynamic = "force-dynamic";

const CLASSES = ["", "HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS", "MED_CANNABIS"];

const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;

/** What a row applies to, in words. */
function appliesTo(r: GstRate): string {
  if (r.hsnPrefix) return `HSN ${r.hsnPrefix}…`;
  if (r.cls) return r.cls.replace(/_/g, " ");
  return "—";
}

export default async function AdminTaxPage({ searchParams }: { searchParams: Promise<{ saved?: string; err?: string }> }) {
  const { saved, err } = await searchParams;
  const rates = await readTaxRates();
  const today = new Date().toISOString().slice(0, 10);
  const future = rates.filter((r) => r.effectiveFrom > today).length;

  return (
    <Shell active="/admin/finance/tax" breadcrumb={["Admin", "Money", "Finance", "GST rates"]} title="GST rates">
      {saved && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="GST rates saved">
            New slabs apply to invoices raised from their date of effect. Invoices already raised keep the rate
            they were raised at.
          </Banner>
        </div>
      )}
      {err === "empty" && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger" title="That would have left no rate table">
            At least one slab must remain, otherwise every line would fall back to {pct(GST_FALLBACK_BPS)}. Nothing
            was changed.
          </Banner>
        </div>
      )}

      <form action={saveTaxRates} className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><Percent size={16} strokeWidth={2.2} aria-hidden /> Slabs in the table</span>}
          action={future > 0 ? <StatusPill tone="info">{future} scheduled</StatusPill> : undefined}
          pad0
        >
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Applies to</th>
                  <th style={{ textAlign: "left" }}>Rate (%)</th>
                  <th style={{ textAlign: "left" }}>In force from</th>
                  <th style={{ textAlign: "left" }}>Note</th>
                  <th style={{ textAlign: "left" }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r, i) => (
                  <tr key={`${r.hsnPrefix ?? r.cls}-${r.effectiveFrom}-${i}`}>
                    <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                      <span className="vh-row" style={{ gap: 6 }}>
                        {appliesTo(r)}
                        {r.effectiveFrom > today && <StatusPill tone="info">scheduled</StatusPill>}
                      </span>
                    </td>
                    <td>
                      <input
                        className="vh-input tabular" name={`bps_${i}`} type="number" min={0} max={10000} step={25}
                        defaultValue={r.bps} style={{ width: 110 }}
                        aria-label={`Rate in basis points for ${appliesTo(r)}`}
                      />
                      <span className="vh-help">bps · {pct(r.bps)}</span>
                    </td>
                    <td>
                      <input
                        className="vh-input" name={`from_${i}`} type="date" defaultValue={r.effectiveFrom}
                        style={{ width: 165 }} aria-label={`Date of effect for ${appliesTo(r)}`}
                      />
                    </td>
                    <td className="small muted" style={{ maxWidth: 220 }}>
                      {r.note ?? (r.notification ? `Notification ${r.notification}` : "—")}
                    </td>
                    <td>
                      <label className="vh-row small" style={{ gap: 6 }}>
                        <input type="checkbox" name={`remove_${i}`} aria-label={`Remove the ${appliesTo(r)} slab`} />
                        <span className="muted">remove</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><Plus size={16} strokeWidth={2.2} aria-hidden /> Add a slab</span>}>
          <div className="vh-grid cols-3" style={{ gap: 16 }}>
            <div className="vh-field">
              <label className="vh-label" htmlFor="new_hsn">HSN prefix</label>
              <input className="vh-input mono" id="new_hsn" name="new_hsn" maxLength={8} placeholder="3304" />
              <span className="vh-help">Matched against the start of a product&rsquo;s HSN. Longest match wins.</span>
            </div>
            <div className="vh-field">
              <label className="vh-label" htmlFor="new_cls">…or a compliance class</label>
              <select className="vh-select" id="new_cls" name="new_cls" defaultValue="">
                {CLASSES.map((c) => <option key={c || "none"} value={c}>{c ? c.replace(/_/g, " ") : "— none —"}</option>)}
              </select>
              <span className="vh-help">Used when no HSN row covers the line.</span>
            </div>
            <div className="vh-field">
              <label className="vh-label" htmlFor="new_bps">Rate (bps)</label>
              <input className="vh-input tabular" id="new_bps" name="new_bps" type="number" min={0} max={10000} step={25} placeholder="1800" />
              <span className="vh-help">1800 = 18%.</span>
            </div>
            <div className="vh-field">
              <label className="vh-label" htmlFor="new_from">In force from</label>
              <input className="vh-input" id="new_from" name="new_from" type="date" defaultValue={today} />
            </div>
            <div className="vh-field" style={{ gridColumn: "span 2" }}>
              <label className="vh-label" htmlFor="new_note">Note / notification reference</label>
              <input className="vh-input" id="new_note" name="new_note" maxLength={60} placeholder="e.g. Notification 01/2026 — topicals" />
            </div>
          </div>
          <button className="vh-btn vh-btn-primary" type="submit" style={{ marginTop: 16, justifySelf: "start" }}>
            Save GST rates
          </button>
        </Card>
      </form>

      <Card title={<span className="vh-row" style={{ gap: 8 }}><Info size={16} strokeWidth={2.2} aria-hidden /> How a rate is picked</span>}>
        <ol className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>The longest HSN prefix that matches the product&rsquo;s HSN, taking the row in force on the order date.</li>
          <li>Otherwise the row for the product&rsquo;s compliance class, again as of the order date.</li>
          <li>Otherwise {pct(GST_FALLBACK_BPS)} — set a class row for anything you don&rsquo;t want landing here.</li>
        </ol>
        <p className="small muted" style={{ margin: "10px 0 0" }}>
          Prices are GST-inclusive, so changing a slab changes how an invoice splits taxable value and tax — it
          does not change the price a buyer was quoted. Sellers set the HSN on each product; see{" "}
          <Link href="/admin/finance">Finance</Link> for the collected-tax report.
        </p>
      </Card>
    </Shell>
  );
}
