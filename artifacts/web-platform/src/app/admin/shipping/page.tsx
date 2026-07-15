/**
 * VEDIC HEMP — SHIPPING & DELIVERY (admin)
 *
 * Delivery zones and their rates. Each zone has a base charge (first kg) and a
 * per-kg surcharge; order weight comes from the products, so the buyer's quote
 * reflects what's in the cart. Free shipping applies above a threshold. All of
 * this is computed server-side at checkout — the page never decides a charge.
 * Age-gated (CBD wellness) serviceability is decided per PIN by the courier net.
 */

import type { Metadata } from "next";
import { Truck, MapPin } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, MoneyText } from "@/components/ui";
import { readShipping, etaLabel } from "@/lib/shipping";
import { saveShipping } from "../actions";

export const metadata: Metadata = { title: "Shipping · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminShippingPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const cfg = await readShipping();
  const rupees = (p: number) => Math.round(p / 100);

  return (
    <Shell active="/admin/shipping" breadcrumb={["Admin", "Money", "Shipping"]} title="Shipping & delivery">
      {saved && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title="Shipping saved">New rates apply to the next checkout immediately — buyers see the updated charge and estimate.</Banner></div>}

      <form action={saveShipping} className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><Truck size={16} strokeWidth={2.2} aria-hidden /> Delivery zones &amp; rates</span>} pad0>
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Zone</th>
                  <th style={{ textAlign: "left" }}>Covers</th>
                  <th style={{ textAlign: "left" }}>Base (₹, first kg)</th>
                  <th style={{ textAlign: "left" }}>Per extra kg (₹)</th>
                  <th style={{ textAlign: "left" }}>Delivery</th>
                </tr>
              </thead>
              <tbody>
                {cfg.zones.map((z) => (
                  <tr key={z.id}>
                    <td style={{ fontWeight: 700 }}><span className="vh-row" style={{ gap: 6 }}><MapPin size={13} aria-hidden style={{ color: "var(--vh-accent)" }} /> {z.name}</span></td>
                    <td className="small muted" style={{ maxWidth: 260 }}>{z.states.length ? z.states.map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase())).join(", ") : "Everywhere not in another zone"}</td>
                    <td><input className="vh-input" name={`base_${z.id}`} type="number" min={0} defaultValue={rupees(z.basePaise)} style={{ width: 110 }} aria-label={`Base rate for ${z.name}`} /></td>
                    <td><input className="vh-input" name={`perkg_${z.id}`} type="number" min={0} defaultValue={rupees(z.perKgPaise)} style={{ width: 110 }} aria-label={`Per-kg rate for ${z.name}`} /></td>
                    <td className="small tabular">{etaLabel(z)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Rules">
          <div className="vh-grid cols-2" style={{ gap: 16 }}>
            <div className="vh-field">
              <label className="vh-label" htmlFor="freeAt">Free shipping at / above (₹)</label>
              <input className="vh-input" id="freeAt" name="freeAt" type="number" min={0} defaultValue={rupees(cfg.freeAtPaise)} />
              <span className="vh-help">Currently free over <MoneyText paise={cfg.freeAtPaise} /> across all zones.</span>
            </div>
            <div className="vh-field">
              <label className="vh-label" htmlFor="defaultWeight">Default item weight (grams)</label>
              <input className="vh-input" id="defaultWeight" name="defaultWeight" type="number" min={1} defaultValue={cfg.defaultWeightGrams} />
              <span className="vh-help">Used when a product has no weight set. Sellers set weight per product.</span>
            </div>
          </div>
          <button className="vh-btn vh-btn-primary" type="submit" style={{ marginTop: 16, justifySelf: "start" }}>Save shipping</button>
        </Card>
      </form>

      <p className="small muted" style={{ marginTop: "var(--sp-3)" }}>
        Age-gated CBD wellness can&rsquo;t be delivered to some PIN codes yet (no age-verified handover). That
        serviceability check runs per PIN on the product page and at checkout — a stale client can&rsquo;t bypass it.
      </p>
    </Shell>
  );
}
