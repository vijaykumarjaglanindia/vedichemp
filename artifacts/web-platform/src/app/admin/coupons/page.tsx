/**
 * VEDIC HEMP — COUPONS & PROMOTIONS (admin)
 *
 * Platform-wide coupons plus oversight of every coupon on the marketplace
 * (including seller-created ones). Discounts are always applied server-side at
 * checkout — a stale client price never wins — and expiry + usage limits are
 * enforced on every redemption. A coupon can be switched off but its history
 * stays. Promotional labels pass the same claims copy-check as all copy.
 */

import type { Metadata } from "next";
import { TicketPercent, Plus } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, StatusPill, MoneyText } from "@/components/ui";
import { couponLive, readCoupons } from "@/lib/commerce";
import { adminCreateCoupon, toggleCoupon } from "../actions";

export const metadata: Metadata = { title: "Coupons · Admin" };
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { sev: "ok" | "danger" | "warn"; text: string }> = {
  created: { sev: "ok", text: "Coupon created — it's live at checkout immediately, applied server-side." },
  toggled: { sev: "ok", text: "Coupon updated. Disabled coupons stop working right away; their history is kept." },
  code: { sev: "danger", text: "Code should be 4–16 letters/digits." },
  pct: { sev: "danger", text: "A percentage must be between 1% and 60%." },
  amount: { sev: "danger", text: "A flat amount must be between ₹1 and ₹5,00,000." },
  cls: { sev: "danger", text: "Pick a valid category or leave it storewide." },
  date: { sev: "danger", text: "The expiry must be today or later." },
  dupe: { sev: "danger", text: "That code already exists." },
};

function statusOf(c: { enabled: boolean; validTo?: string; usageLimit?: number; usedCount?: number }): { tone: "ok" | "warn" | "danger"; label: string } {
  if (!c.enabled) return { tone: "warn", label: "Paused" };
  if (c.validTo && new Date().toISOString().slice(0, 10) > c.validTo) return { tone: "danger", label: "Expired" };
  if (c.usageLimit !== undefined && (c.usedCount ?? 0) >= c.usageLimit) return { tone: "danger", label: "Used up" };
  return { tone: "ok", label: "Active" };
}

export default async function AdminCouponsPage({ searchParams }: { searchParams: Promise<{ done?: string; err?: string }> }) {
  const { done, err } = await searchParams;
  const all = Object.entries(await readCoupons()).map(([code, c]) => ({ code, ...c }));
  const msg = (done && MESSAGES[done]) || (err && MESSAGES[err]) || undefined;

  return (
    <Shell active="/admin/coupons" breadcrumb={["Admin", "Money", "Coupons"]} title="Coupons & promotions"
      actions={<a className="vh-btn vh-btn-sm vh-btn-primary vh-row" href="#new" style={{ gap: 6 }}><Plus size={14} aria-hidden /> New coupon</a>}
    >
      {msg && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity={msg.sev}>{msg.text}</Banner></div>}

      <Card title={<span className="vh-row" style={{ gap: 8 }}><TicketPercent size={16} strokeWidth={2.2} aria-hidden /> All coupons</span>} action={<span className="small muted">{all.filter(couponLive).length} live</span>} pad0>
        <div style={{ overflowX: "auto" }}>
          <table className="vh-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Code</th>
                <th style={{ textAlign: "left" }}>Discount</th>
                <th style={{ textAlign: "left" }}>Scope</th>
                <th style={{ textAlign: "left" }}>Min</th>
                <th style={{ textAlign: "left" }}>Expires</th>
                <th style={{ textAlign: "right" }}>Used</th>
                <th style={{ textAlign: "left" }}>Owner</th>
                <th style={{ textAlign: "left" }}>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {all.map((c) => {
                const st = statusOf(c);
                return (
                  <tr key={c.code}>
                    <td className="mono" style={{ fontWeight: 700 }}>{c.code}</td>
                    <td>{c.freeShip ? "Free shipping" : c.fixedPaise ? <><MoneyText paise={c.fixedPaise} /> off</> : <>{c.pct}% off{c.capPaise > 0 && <span className="muted"> (max <MoneyText paise={c.capPaise} />)</span>}</>}</td>
                    <td className="small">{c.cls ? c.cls.replace("_", " ").toLowerCase() : "storewide"}</td>
                    <td className="small">{c.minPaise > 0 ? <MoneyText paise={c.minPaise} /> : "—"}</td>
                    <td className="small tabular">{c.validTo ?? "—"}</td>
                    <td className="small tabular" style={{ textAlign: "right" }}>{c.usedCount ?? 0}{c.usageLimit !== undefined ? ` / ${c.usageLimit}` : ""}</td>
                    <td className="small">{c.owner ?? "platform"}</td>
                    <td><StatusPill tone={st.tone}>{st.label}</StatusPill></td>
                    <td style={{ textAlign: "right" }}>
                      <form action={toggleCoupon}>
                        <input type="hidden" name="code" value={c.code} />
                        <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">{c.enabled ? "Disable" : "Enable"}</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div id="new" style={{ marginTop: "var(--sp-4)", scrollMarginTop: 90 }}>
        <Card title="Create a platform coupon">
          <form action={adminCreateCoupon} className="vh-grid" style={{ gap: 16 }}>
            <div className="vh-grid cols-3" style={{ gap: 16 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ac-code">Code <span className="req">*</span></label>
                <input className="vh-input mono" id="ac-code" name="code" required minLength={4} maxLength={16} placeholder="WELCOME20" style={{ textTransform: "uppercase" }} />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ac-kind">Type</label>
                <select className="vh-select" id="ac-kind" name="kind" defaultValue="PERCENT">
                  <option value="PERCENT">Percentage off</option>
                  <option value="FIXED">Flat amount off (₹)</option>
                </select>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ac-value">Amount <span className="req">*</span></label>
                <input className="vh-input" id="ac-value" name="value" type="number" min={1} required placeholder="20" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ac-min">Minimum order (₹)</label>
                <input className="vh-input" id="ac-min" name="minRupees" type="number" min={0} placeholder="0" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ac-cap">Max discount (₹, % only)</label>
                <input className="vh-input" id="ac-cap" name="capRupees" type="number" min={0} placeholder="0 = no cap" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ac-usage">Total uses (blank = unlimited)</label>
                <input className="vh-input" id="ac-usage" name="usageLimit" type="number" min={1} placeholder="e.g. 500" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ac-cls">Applies to</label>
                <select className="vh-select" id="ac-cls" name="cls" defaultValue="">
                  <option value="">Storewide</option>
                  <option value="HEMP_FOOD">Hemp Food</option>
                  <option value="AYURVEDA">Ayurveda</option>
                  <option value="CBD_WELLNESS">CBD Wellness</option>
                </select>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ac-validto">Expires (optional)</label>
                <input className="vh-input" id="ac-validto" name="validTo" type="date" />
              </div>
              <div className="vh-field" style={{ display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className="vh-btn vh-btn-primary" style={{ width: "100%" }}>Create coupon</button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
