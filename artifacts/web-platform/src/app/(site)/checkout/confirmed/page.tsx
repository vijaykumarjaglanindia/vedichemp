/**
 * VEDIC HEMP — ORDER CONFIRMED
 *
 * Reads the server-issued order record (httpOnly cookie in demo mode; the DB
 * order once DATABASE_URL is attached) and shows the marketplace flow the
 * buyer just entered: paid → forwarded to seller → seller ships → track.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, CheckCircle2, PackageCheck, Send, Truck } from "lucide-react";
import { EmptyState, MoneyText, Timeline } from "@/components/ui";
import type { OrderRecord } from "../../cart/actions";

export const metadata: Metadata = { title: "Order confirmed" };

export default async function ConfirmedPage() {
  const jar = await cookies();
  let order: OrderRecord | null = null;
  try { order = JSON.parse(jar.get("vh-last-order")?.value ?? "null") as OrderRecord | null; } catch { order = null; }

  if (!order) {
    return (
      <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)" }}>
        <EmptyState icon="🧾" headline="No recent order found" sub="Your confirmation may have expired — check your orders in My Account." cta={{ label: "Go to My Account", href: "/account/orders" }} />
      </div>
    );
  }

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)", maxWidth: 880 }}>
      <div style={{ textAlign: "center", marginBottom: "var(--sp-5)" }}>
        <CheckCircle2 size={44} aria-hidden style={{ color: "var(--vh-ok)", marginBottom: 10 }} />
        <h1 style={{ marginBottom: 6 }}>Order placed</h1>
        <p className="muted" style={{ margin: 0 }}>
          Reference <b className="mono" style={{ color: "var(--vh-ink)" }}>{order.reference}</b> ·
          confirmation sent to your registered contact
        </p>
      </div>

      <div className="vh-split">
        <section className="vh-card">
          <h3 style={{ marginBottom: 14 }}>What happens now</h3>
          <Timeline
            nodes={[
              { label: "Payment received", at: "Just now", state: "done" },
              { label: `Order forwarded to ${order.items[0]?.seller ?? "the seller"}`, at: "Within minutes — it appears in their Seller Central panel", state: "current" },
              { label: "Seller packs & hands to their delivery partner", at: "Marked shipped only after handover", state: "pending" },
              { label: `Delivery to ${order.city} ${order.pincode}`, at: "Track it from My Account → Orders", state: "pending" },
            ]}
          />
          <div className="vh-row" style={{ gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            <Link href="/account/orders" className="vh-btn vh-btn-primary vh-btn-sm">
              Track this order <ArrowRight size={13} aria-hidden />
            </Link>
            <Link href="/catalogue" className="vh-btn vh-btn-ghost vh-btn-sm">Continue shopping</Link>
          </div>
        </section>

        <aside className="vh-card">
          <h3 style={{ marginBottom: 12 }}>Summary</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {order.items.map((it) => (
              <div key={it.title} className="vh-row small" style={{ gap: 8 }}>
                <span aria-hidden>{it.emoji}</span>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
                <span className="muted tabular" style={{ marginLeft: "auto" }}>× {it.qty}</span>
              </div>
            ))}
          </div>
          <hr className="vh-divider" />
          <div className="vh-row-between small" style={{ padding: "3px 0" }}>
            <span className="muted">Subtotal</span><MoneyText paise={order.subtotalPaise} />
          </div>
          <div className="vh-row-between small" style={{ padding: "3px 0" }}>
            <span className="muted">Shipping</span>
            {order.shippingPaise === 0 ? <span style={{ color: "var(--vh-ok)", fontWeight: 600 }}>Free</span> : <MoneyText paise={order.shippingPaise} />}
          </div>
          <div className="vh-row-between" style={{ padding: "6px 0" }}>
            <span style={{ fontWeight: 600 }}>Paid{order.payment === "cod" ? " on delivery" : ""}</span>
            <MoneyText paise={order.totalPaise} className="vh-product-title" />
          </div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {[
              { icon: Send, text: "Sellers see only what they need to fulfil this order" },
              { icon: Truck, text: "Shipped by the seller's delivery partner" },
              { icon: PackageCheck, text: "Refund-first protection if anything goes wrong" },
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
