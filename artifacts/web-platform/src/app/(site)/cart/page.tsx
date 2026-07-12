/**
 * VEDIC HEMP — CART
 *
 * Fully server-rendered: lines come from the httpOnly cart cookie, every
 * amount is computed server-side in integer paise. Quantity and removal are
 * server actions — no client JS owns commerce state.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import { Banner, EmptyState, MoneyText } from "@/components/ui";
import { AdSlot } from "@/components/ui/ads";
import { priceCart } from "@/lib/cart";
import { removeFromCart, setQty } from "./actions";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const cart = await priceCart();

  if (cart.lines.length === 0) {
    return (
      <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)" }}>
        <EmptyState
          icon="🛒"
          headline="Your cart is empty"
          sub="Everything here is listed by licensed sellers — find something worth reordering."
          cta={{ label: "Browse the catalogue", href: "/catalogue" }}
        />
      </div>
    );
  }

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-4)", paddingBottom: "var(--sp-7)" }}>
      <h1 style={{ marginBottom: 4 }}>Your cart</h1>
      <p className="small muted" style={{ marginBottom: "var(--sp-4)" }}>
        <span className="tabular">{cart.count}</span> item{cart.count === 1 ? "" : "s"} · prices include all taxes
      </p>

      <div className="vh-split">
        {/* Lines */}
        <div style={{ display: "grid", gap: 12 }}>
          {cart.lines.map(({ product, qty, linePaise }) => (
            <article key={product.id} className="vh-product-row">
              <Link href={`/products/${product.slug}`} className="vh-product-media" aria-hidden tabIndex={-1}>
                {product.emoji}
              </Link>
              <div style={{ minWidth: 0 }}>
                <Link href={`/products/${product.slug}`} className="vh-product-title" style={{ display: "block" }}>
                  {product.title}
                </Link>
                <div className="small muted" style={{ margin: "2px 0 8px" }}>
                  Sold &amp; shipped by {product.seller}
                </div>
                <div className="vh-row" style={{ gap: 8 }}>
                  <form action={setQty} className="vh-row" style={{ gap: 0, border: "1px solid var(--vh-line-strong)", borderRadius: 8, overflow: "hidden" }}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button name="delta" value="down" className="vh-iconbtn" style={{ border: 0, borderRadius: 0, width: 32, height: 32 }} aria-label={`Decrease quantity of ${product.title}`}>
                      <Minus size={13} aria-hidden />
                    </button>
                    <span className="tabular" style={{ minWidth: 34, textAlign: "center", fontWeight: 600, fontSize: ".88rem" }}>{qty}</span>
                    <button name="delta" value="up" className="vh-iconbtn" style={{ border: 0, borderRadius: 0, width: 32, height: 32 }} aria-label={`Increase quantity of ${product.title}`}>
                      <Plus size={13} aria-hidden />
                    </button>
                  </form>
                  <form action={removeFromCart}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button className="vh-btn vh-btn-ghost vh-btn-sm" aria-label={`Remove ${product.title} from cart`}>
                      <Trash2 size={13} aria-hidden /> Remove
                    </button>
                  </form>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <MoneyText paise={linePaise} className="vh-product-title" />
                {qty > 1 && (
                  <div className="small muted tabular">
                    <MoneyText paise={product.pricePaise} /> each
                  </div>
                )}
              </div>
            </article>
          ))}

          {cart.ageGated && (
            <Banner severity="warn" title="Age-restricted item in cart">
              Your cart contains a 21+ CBD wellness product. You&rsquo;ll confirm your age at
              checkout, and it is verified again on delivery handover.
            </Banner>
          )}

          {/* Sponsored upsell (cart-upsell) — labelled, outside the order totals */}
          <AdSlot cls="HEMP_FOOD" placement="cart-upsell" unstyled>
            <a href="/products/hemp-hearts-400g" className="vh-product-row" style={{ textDecoration: "none", borderColor: "color-mix(in srgb, var(--vh-ad) 30%, var(--vh-line))" }}>
              <span className="vh-product-media" style={{ fontSize: "1.6rem" }} aria-hidden>🌾</span>
              <span style={{ minWidth: 0 }}>
                <span className="vh-product-title" style={{ display: "block" }}>Add Hemp Hearts 400g — pairs with your order</span>
                <span className="small muted">Ananda Foods · ships with the same courier window</span>
              </span>
              <MoneyText paise={64900} className="vh-product-title" />
            </a>
          </AdSlot>
        </div>

        {/* Summary */}
        <aside className="vh-card" style={{ position: "sticky", top: 90 }}>
          <h3 style={{ marginBottom: 14 }}>Order summary</h3>
          <div className="vh-row-between small" style={{ padding: "6px 0" }}>
            <span className="muted">Subtotal</span>
            <MoneyText paise={cart.subtotalPaise} />
          </div>
          <div className="vh-row-between small" style={{ padding: "6px 0" }}>
            <span className="muted">Shipping</span>
            {cart.shippingPaise === 0 ? <span style={{ color: "var(--vh-ok)", fontWeight: 600 }}>Free</span> : <MoneyText paise={cart.shippingPaise} />}
          </div>
          {cart.shippingPaise > 0 && (
            <p className="small muted" style={{ margin: "2px 0 0" }}>
              Free shipping on orders above <MoneyText paise={500000} />.
            </p>
          )}
          <hr className="vh-divider" />
          <div className="vh-row-between" style={{ marginBottom: 14 }}>
            <span style={{ fontWeight: 600 }}>Total</span>
            <MoneyText paise={cart.totalPaise} className="vh-stat-value" />
          </div>
          <Link href="/checkout" className="vh-btn vh-btn-primary vh-btn-lg" style={{ width: "100%" }}>
            Proceed to checkout <ArrowRight size={15} aria-hidden />
          </Link>
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
            {[
              { icon: ShieldCheck, text: "Totals computed server-side — the page never decides a price" },
              { icon: Truck, text: "Packed & shipped by the seller who lists each item" },
              { icon: ShoppingBag, text: "Cash on Delivery available" },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="vh-row small muted" style={{ gap: 8, alignItems: "flex-start" }}>
                <Icon size={13} aria-hidden style={{ color: "var(--vh-accent)", flexShrink: 0, marginTop: 2 }} />
                {text}
              </span>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
