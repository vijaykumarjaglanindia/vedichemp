/**
 * VEDIC HEMP — COMMERCE SETTINGS (the owner's panel)
 *
 * Shipping economics, loyalty and referral rates, gift cards, the buyer
 * coupon table, and category display copy — every business number and label,
 * editable. Compliance flags (Rx, age gate, advertisability) are shown
 * read-only: the owner edits words and numbers, never the law.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgePercent, Boxes, Gift, Truck } from "lucide-react";
import { Shell } from "../../Shell";
import { Banner, Card, MoneyText, StatusPill } from "@/components/ui";
import { CLASS_META } from "@/lib/compliance";
import { readCommerce, readCoupons, readGiftCards } from "@/lib/commerce";
import { createGiftCard, saveClassDisplay, saveCommerceSettings, toggleCoupon, upsertCoupon } from "./actions";

export const metadata: Metadata = { title: "Commerce settings · Admin" };
export const dynamic = "force-dynamic";

export default async function CommercePage({
  searchParams,
}: {
  searchParams: Promise<{ cm?: string; cp?: string; gc?: string; cd?: string }>;
}) {
  const { cm, cp, gc, cd } = await searchParams;
  const commerce = await readCommerce();
  const coupons = await readCoupons();
  const giftCards = await readGiftCards();
  const classes = ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS", "MED_CANNABIS"] as const;

  return (
    <Shell
      active="/admin/settings"
      breadcrumb={["Admin", "Settings", "Commerce"]}
      title="Commerce settings"
      actions={<Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/settings"><ArrowLeft size={14} aria-hidden /> Settings</Link>}
    >
      <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
        {cm === "saved" && <Banner severity="ok" title="Economics saved">Shipping, loyalty and referral numbers apply to every cart from the next request.</Banner>}
        {cm === "bad" && <Banner severity="danger">Enter non-negative numbers.</Banner>}
        {cp === "saved" && <Banner severity="ok" title="Coupon saved">Buyers can apply it at the cart immediately.</Banner>}
        {cp === "toggled" && <Banner severity="ok" title="Coupon updated" />}
        {(cp === "code" || cp === "pct" || cp === "label") && <Banner severity="danger">Coupon needs a 4+ char code, 0–50% rate, and a claims-free label.</Banner>}
        {gc === "saved" && <Banner severity="ok" title="Gift card created">The code redeems on the wallet page.</Banner>}
        {gc === "bad" && <Banner severity="danger">Gift cards need a 6+ char code and a value up to ₹10,000.</Banner>}
        {cd === "saved" && <Banner severity="ok" title="Category copy saved">Labels and blurbs update across the whole site — compliance flags are untouched.</Banner>}
        {cd === "claims" && <Banner severity="danger">Category copy cannot carry claims language.</Banner>}

        <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Truck size={16} strokeWidth={2.2} aria-hidden /> Shipping, loyalty & referral</span>}>
            <form action={saveCommerceSettings} className="vh-grid cols-2" style={{ gap: 12 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="cm-free">Free shipping at (₹)</label>
                <input className="vh-input" id="cm-free" name="freeShipAt" type="number" min={0} step={1} defaultValue={commerce.freeShipAtPaise / 100} />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="cm-flat">Flat shipping below it (₹)</label>
                <input className="vh-input" id="cm-flat" name="flatShip" type="number" min={0} step={1} defaultValue={commerce.flatShipPaise / 100} />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="cm-pts">Loyalty points per ₹100</label>
                <input className="vh-input" id="cm-pts" name="ptsPer100" type="number" min={0} step={1} defaultValue={commerce.loyaltyPtsPer100} />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="cm-ref">Referral credit (₹)</label>
                <input className="vh-input" id="cm-ref" name="referral" type="number" min={0} step={1} defaultValue={commerce.referralCreditPaise / 100} />
              </div>
              <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit" style={{ justifySelf: "start" }}>Save economics</button>
            </form>
            <p className="small muted" style={{ margin: "10px 0 0" }}>
              All amounts store as integer paise; totals stay server-computed.
            </p>
          </Card>

          <Card title={<span className="vh-row" style={{ gap: 8 }}><Gift size={16} strokeWidth={2.2} aria-hidden /> Gift cards</span>}>
            <ul className="small" style={{ listStyle: "none", margin: "0 0 10px", padding: 0, display: "grid", gap: 4 }}>
              {Object.entries(giftCards).map(([code, paise]) => (
                <li key={code} className="vh-row-between">
                  <span className="mono">{code}</span>
                  <MoneyText paise={paise} />
                </li>
              ))}
            </ul>
            <form action={createGiftCard} className="vh-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="vh-field" style={{ flex: "1 1 160px" }}>
                <label className="vh-label" htmlFor="gc-code">New code</label>
                <input className="vh-input mono" id="gc-code" name="code" maxLength={24} placeholder="VEDIC-GIFT-250" required />
              </div>
              <div className="vh-field" style={{ width: 120 }}>
                <label className="vh-label" htmlFor="gc-val">Value (₹)</label>
                <input className="vh-input" id="gc-val" name="value" type="number" min={1} max={10000} required />
              </div>
              <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit">Create</button>
            </form>
          </Card>
        </div>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><BadgePercent size={16} strokeWidth={2.2} aria-hidden /> Buyer coupons</span>}>
          <div style={{ overflowX: "auto", marginBottom: 14 }}>
            <table className="vh-table">
              <thead><tr><th>Code</th><th>Deal</th><th>Min cart</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {Object.entries(coupons).map(([code, c]) => (
                  <tr key={code}>
                    <td className="mono" style={{ fontWeight: 700 }}>{code}</td>
                    <td className="small">{c.label}</td>
                    <td className="small tabular">{c.minPaise ? `₹${c.minPaise / 100}` : "—"}</td>
                    <td><StatusPill tone={c.enabled ? "ok" : "neutral"}>{c.enabled ? "ACTIVE" : "DISABLED"}</StatusPill></td>
                    <td>
                      <form action={toggleCoupon}>
                        <input type="hidden" name="code" value={code} />
                        <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">{c.enabled ? "Disable" : "Enable"}</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form action={upsertCoupon} className="vh-row" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="vh-field"><label className="vh-label" htmlFor="cp-code">Code</label><input className="vh-input mono" id="cp-code" name="code" maxLength={16} required placeholder="OWNER20" /></div>
            <div className="vh-field" style={{ width: 90 }}><label className="vh-label" htmlFor="cp-pct">%</label><input className="vh-input" id="cp-pct" name="pct" type="number" min={0} max={50} required /></div>
            <div className="vh-field" style={{ width: 110 }}><label className="vh-label" htmlFor="cp-cap">Cap (₹)</label><input className="vh-input" id="cp-cap" name="cap" type="number" min={0} defaultValue={0} /></div>
            <div className="vh-field" style={{ width: 120 }}><label className="vh-label" htmlFor="cp-min">Min cart (₹)</label><input className="vh-input" id="cp-min" name="min" type="number" min={0} defaultValue={0} /></div>
            <div className="vh-field" style={{ flex: "1 1 220px" }}><label className="vh-label" htmlFor="cp-label">Label</label><input className="vh-input" id="cp-label" name="label" maxLength={80} required placeholder="20% off, owner's launch week" /></div>
            <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit">Save coupon</button>
          </form>
        </Card>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><Boxes size={16} strokeWidth={2.2} aria-hidden /> Category display copy</span>}>
          <div className="vh-grid cols-2" style={{ gap: 14 }}>
            {classes.map((cls) => {
              const meta = CLASS_META[cls];
              return (
                <form key={cls} action={saveClassDisplay} style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: "12px 14px", display: "grid", gap: 8 }}>
                  <input type="hidden" name="cls" value={cls} />
                  <div className="vh-row" style={{ gap: 8 }}>
                    <span aria-hidden>{meta.emoji}</span>
                    <strong style={{ color: "var(--vh-ink)" }}>{cls}</strong>
                    <span className="vh-spacer" />
                    <StatusPill tone="neutral">{meta.rxRequired ? "Rx" : meta.ageGated ? "21+" : "Open"}{meta.advertisable ? "" : " · no ads"}</StatusPill>
                  </div>
                  <div className="vh-grid cols-2" style={{ gap: 8 }}>
                    <input className="vh-input" name="label" maxLength={40} defaultValue={meta.label} aria-label={`${cls} label`} />
                    <input className="vh-input" name="short" maxLength={30} defaultValue={meta.short} aria-label={`${cls} short label`} />
                  </div>
                  <input className="vh-input" name="blurb" maxLength={160} defaultValue={meta.blurb} aria-label={`${cls} blurb`} />
                  <div className="vh-row" style={{ gap: 8 }}>
                    <input className="vh-input" name="emoji" maxLength={4} defaultValue={meta.emoji} style={{ width: 70 }} aria-label={`${cls} emoji`} />
                    <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Save</button>
                  </div>
                </form>
              );
            })}
          </div>
          <p className="small muted" style={{ margin: "12px 0 0" }}>
            Rx-required, age-gating and advertisability are compliance properties — they have no
            inputs here and cannot be edited by anyone.
          </p>
        </Card>
      </div>
    </Shell>
  );
}
