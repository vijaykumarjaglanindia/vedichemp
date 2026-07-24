/**
 * VEDIC HEMP — CHECKOUT
 *
 * One page: address, payment method, compliance confirmation, summary.
 * Validation runs in the placeOrder server action; on failure the typed
 * fields come back from a short-lived draft cookie with an inline error —
 * nothing the buyer typed is lost.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Banknote, CreditCard, Lock, Smartphone } from "lucide-react";
import { Banner, MoneyText } from "@/components/ui";
import { priceCart } from "@/lib/cart";
import { readAddresses } from "@/lib/engage";
import { placeOrder } from "../cart/actions";
import { randomUUID } from "node:crypto";
import { readEnabledPayments } from "@/lib/payments";
import { getSession } from "@/lib/auth-lite";
import { balancePaise } from "@/lib/wallet";

export const metadata: Metadata = { title: "Checkout" };

const ERRORS: Record<string, string> = {
  name: "Please enter your full name (letters only, 2–60 characters).",
  mobile: "Enter a valid 10-digit Indian mobile number starting 6–9.",
  address: "The address line looks too short — include house/street details.",
  city: "City and state are required.",
  pincode: "PIN code must be exactly 6 digits.",
  payment: "Choose a payment method.",
  age: "Please confirm you are 21 or older — your cart contains an age-restricted item.",
  serviceable: "A CBD wellness item in your cart can't be delivered to that pincode yet. Remove it, or ship to a different address.",
};

const PAY_ICONS: Record<string, typeof Banknote> = {
  upi: Smartphone, card: CreditCard, netbanking: Banknote, wallet: CreditCard, emi: CreditCard, cod: Banknote,
};

interface Draft { name?: string; mobile?: string; line1?: string; city?: string; state?: string; pincode?: string; payment?: string }

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { err } = await searchParams;
  const cart = await priceCart();
  if (cart.lines.length === 0) redirect("/cart");

  const jar = await cookies();
  // Wallet credit the buyer may apply. The APPLICABLE amount is capped at the
  // order total — you can't overpay from the wallet. The server recomputes this
  // on submit; this is display only.
  const session = await getSession();
  const walletBalance = session?.email ? await balancePaise(session.email) : 0;
  const walletApplicable = Math.min(walletBalance, cart.totalPaise);
  const netAfterWallet = cart.totalPaise - walletApplicable;
  const methods = await readEnabledPayments();
  const hasCod = methods.some((mm) => mm.kind === "cod");
  let draft: Draft = {};
  try { draft = JSON.parse(jar.get("vh-checkout-draft")?.value ?? "{}") as Draft; } catch { /* fresh form */ }

  // §1.3 workflow: no draft in flight → prefill from the default saved address.
  const defaultAddress = (await readAddresses()).find((a) => a.isDefault);
  const usingSaved = !draft.name && Boolean(defaultAddress);
  if (usingSaved && defaultAddress) {
    draft = {
      name: defaultAddress.name, mobile: defaultAddress.mobile, line1: defaultAddress.line1,
      city: defaultAddress.city, state: defaultAddress.state, pincode: defaultAddress.pincode,
    };
  }

  const field = (key: keyof typeof ERRORS) => (err === key ? "vh-field invalid" : "vh-field");

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-4)", paddingBottom: "var(--sp-7)" }}>
      <h1 style={{ marginBottom: 4 }}>Checkout</h1>
      <p className="small muted" style={{ marginBottom: "var(--sp-4)" }}>
        After payment, your order is forwarded to the seller, who packs and ships it.
      </p>

      {err && ERRORS[err] && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger" title="Please fix one thing">{ERRORS[err]}</Banner>
        </div>
      )}

      <form action={placeOrder} className="vh-split">
        {/* Per-render idempotency key: a double-submit replays as a read. */}
        <input type="hidden" name="idempotencyKey" value={randomUUID()} />
        {/* Address + payment */}
        <div style={{ display: "grid", gap: "var(--sp-3)" }}>
          <section className="vh-card">
            <h3 style={{ marginBottom: 14 }}>Delivery address</h3>
            {usingSaved && (
              <p className="small" style={{ margin: "0 0 12px", color: "var(--vh-accent)", fontWeight: 600 }}>
                Prefilled from your default saved address — edit anything below, or manage it in{" "}
                <Link href="/account/addresses" style={{ textDecoration: "underline" }}>your address book</Link>.
              </p>
            )}
            <div className="vh-grid cols-2" style={{ gap: 12 }}>
              <div className={field("name")}>
                <label htmlFor="co-name" className="vh-label">Full name <span className="req">*</span></label>
                <input id="co-name" name="name" className="vh-input" defaultValue={draft.name} autoComplete="name" required />
              </div>
              <div className={field("mobile")}>
                <label htmlFor="co-mobile" className="vh-label">Mobile <span className="req">*</span></label>
                <input id="co-mobile" name="mobile" className="vh-input" defaultValue={draft.mobile} inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile" required />
                <span className="vh-help">The courier calls this number on delivery.</span>
              </div>
            </div>
            <div className={field("address")} style={{ marginTop: 12 }}>
              <label htmlFor="co-line1" className="vh-label">Address (house, street, landmark) <span className="req">*</span></label>
              <input id="co-line1" name="line1" className="vh-input" defaultValue={draft.line1} autoComplete="street-address" required />
            </div>
            <div className="vh-grid cols-3" style={{ gap: 12, marginTop: 12 }}>
              <div className={field("city")}>
                <label htmlFor="co-city" className="vh-label">City <span className="req">*</span></label>
                <input id="co-city" name="city" className="vh-input" defaultValue={draft.city} autoComplete="address-level2" required />
              </div>
              <div className={field("city")}>
                <label htmlFor="co-state" className="vh-label">State <span className="req">*</span></label>
                <input id="co-state" name="state" className="vh-input" defaultValue={draft.state} autoComplete="address-level1" required />
              </div>
              <div className={field("pincode")}>
                <label htmlFor="co-pin" className="vh-label">Pincode <span className="req">*</span></label>
                <input id="co-pin" name="pincode" className="vh-input" defaultValue={draft.pincode} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required />
              </div>
            </div>
            {!usingSaved && (
              <label className="vh-row small" style={{ gap: 8, cursor: "pointer", marginTop: 12 }}>
                <input type="checkbox" name="saveAddress" style={{ accentColor: "var(--vh-accent)" }} />
                Save this address to my address book for next time
              </label>
            )}
          </section>

          <section className="vh-card">
            <h3 style={{ marginBottom: 6 }}>Payment</h3>
            <p className="small muted" style={{ margin: "0 0 14px" }}>
              {hasCod
                ? "Orders paid online reach the seller once your payment goes through; Cash on Delivery orders are confirmed right away and paid to the courier — with an ID check on age-restricted items."
                : "Right now, Vedic Hemp takes online payment only — your order reaches the seller once your payment goes through."}
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {methods.map(({ key: value, label, sub }) => {
                const Icon = PAY_ICONS[value] ?? Banknote;
                return (
                <label key={value} className="vh-row" style={{ gap: 12, border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: "12px 14px", cursor: "pointer", alignItems: "flex-start" }}>
                  <input type="radio" name="payment" value={value} defaultChecked={(draft.payment ?? methods[0]?.key) === value} style={{ marginTop: 3, accentColor: "var(--vh-accent)" }} />
                  <Icon size={17} aria-hidden style={{ color: "var(--vh-accent)", marginTop: 1, flexShrink: 0 }} />
                  <span>
                    <span style={{ fontWeight: 600, color: "var(--vh-ink)", display: "block" }}>{label}</span>
                    <span className="small muted">{sub}</span>
                  </span>
                </label>
                );
              })}
            </div>
          </section>

          {cart.ageGated && (
            <section className={err === "age" ? "vh-card" : "vh-card"} style={err === "age" ? { borderColor: "var(--vh-danger)" } : undefined}>
              <label className="vh-row" style={{ gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                <input type="checkbox" name="ageConfirm" style={{ marginTop: 3, accentColor: "var(--vh-accent)" }} />
                <span className="small">
                  <b style={{ color: "var(--vh-ink)" }}>I confirm I am 21 years or older.</b>{" "}
                  Your cart contains a CBD wellness product — age is checked again when your
                  order is handed over.
                </span>
              </label>
            </section>
          )}
        </div>

        {/* Summary */}
        <aside className="vh-card" style={{ position: "sticky", top: 90 }}>
          <h3 style={{ marginBottom: 12 }}>Your order</h3>
          <div style={{ display: "grid", gap: 8, marginBottom: 6 }}>
            {cart.lines.map(({ product, qty, linePaise }) => (
              <div key={product.id} className="vh-row-between small">
                <span className="vh-row" style={{ gap: 8, minWidth: 0 }}>
                  <span aria-hidden>{product.emoji}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {product.title} <span className="muted tabular">× {qty}</span>
                  </span>
                </span>
                <MoneyText paise={linePaise} />
              </div>
            ))}
          </div>
          <hr className="vh-divider" />
          <div className="vh-row-between small" style={{ padding: "3px 0" }}>
            <span className="muted">Subtotal</span><MoneyText paise={cart.subtotalPaise} />
          </div>
          {cart.discountPaise > 0 && (
            <div className="vh-row-between small" style={{ padding: "3px 0" }}>
              <span style={{ color: "var(--vh-ok)", fontWeight: 600 }}>Coupon {cart.couponCode}</span>
              <span style={{ color: "var(--vh-ok)", fontWeight: 600 }}>− <MoneyText paise={cart.discountPaise} /></span>
            </div>
          )}
          <div className="vh-row-between small" style={{ padding: "3px 0" }}>
            <span className="muted">Delivery</span>
            {cart.shippingPaise === 0 ? <span style={{ color: "var(--vh-ok)", fontWeight: 600 }}>Free</span> : <MoneyText paise={cart.shippingPaise} />}
          </div>
          {walletApplicable > 0 && (
            <div style={{ padding: "8px 0", borderTop: "1px dashed var(--vh-line)", marginTop: 4 }}>
              <label className="vh-row" style={{ gap: 8, alignItems: "flex-start", cursor: "pointer" }}>
                <input type="checkbox" name="applyWallet" style={{ marginTop: 3 }} aria-label="Apply wallet credit to this order" />
                <span className="small">
                  <span style={{ fontWeight: 600 }}>Use wallet credit</span> — apply <MoneyText paise={walletApplicable} /> of your <MoneyText paise={walletBalance} /> balance.
                  <span className="muted"> You&rsquo;ll pay <MoneyText paise={netAfterWallet} /> by your chosen method; the rest comes from your wallet.</span>
                </span>
              </label>
            </div>
          )}
          <div className="vh-row-between" style={{ padding: "8px 0 14px" }}>
            <span style={{ fontWeight: 600 }}>Total</span>
            <MoneyText paise={cart.totalPaise} className="vh-stat-value" />
          </div>
          {cart.gstIncludedPaise > 0 && (
            <div className="vh-row-between small" style={{ padding: "0 0 12px", marginTop: -10 }}>
              <span className="muted">Includes GST</span>
              <span className="muted tabular"><MoneyText paise={cart.gstIncludedPaise} /></span>
            </div>
          )}
          <button type="submit" className="vh-btn vh-btn-primary vh-btn-lg" style={{ width: "100%" }}>
            <Lock size={15} aria-hidden /> Place order · <MoneyText paise={cart.totalPaise} />
          </button>
          <p className="small muted" style={{ margin: "10px 0 0" }}>
            By placing this order you agree to the <Link href="/trust">marketplace terms</Link>.
          </p>
        </aside>
      </form>
    </div>
  );
}
