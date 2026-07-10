/**
 * VEDIC HEMP — ORDER DETAIL (§1.4)
 *
 * `params` is a Promise in Next 15 route handlers/pages and must be awaited.
 * All money on this page is server-computed paise, rendered via <MoneyText>.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { FileDown, LifeBuoy, Package, Receipt, RotateCcw, Truck } from "lucide-react";
import { Shell } from "../../Shell";
import { Card, StatusPill, toneForStatus, MoneyText, Timeline, Banner } from "@/components/ui";
import { ORDERS, PRODUCTS } from "@/lib/sample";

export const metadata: Metadata = { title: "Order details" };

const I = { size: 16, strokeWidth: 2.2 } as const;

const LIFECYCLE: { key: string; label: string }[] = [
  { key: "PLACED", label: "Order placed" },
  { key: "PACKED", label: "Packed by seller" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

function title(icon: ReactNode, text: string) {
  return (
    <span className="vh-row" style={{ gap: 8 }}>
      <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)" }}>{icon}</span>
      {text}
    </span>
  );
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = ORDERS.find((o) => o.id === id);
  if (!order) notFound();

  // Server-computed illustrative breakdown (integer paise only — no float rupee math).
  const taxPaise = Math.round(order.totalPaise * 0.05);
  const subtotalPaise = order.totalPaise - taxPaise;

  const currentIndex = order.status === "RETURNED" ? LIFECYCLE.length : LIFECYCLE.findIndex((s) => s.key === order.status);
  const nodes = LIFECYCLE.map((step, i) => ({
    label: step.label,
    state: (order.status === "RETURNED"
      ? "done"
      : i < currentIndex
        ? "done"
        : i === currentIndex
          ? "current"
          : "pending") as "done" | "current" | "pending" | "failed",
    at: i <= currentIndex ? order.placedAt : undefined,
  }));
  if (order.status === "RETURNED") {
    nodes.push({ label: "Returned to seller", state: "failed", at: order.placedAt });
  }

  // Delivery progress summary — steps completed out of the lifecycle.
  const stepsDone = order.status === "RETURNED" ? LIFECYCLE.length : Math.max(currentIndex + 1, 1);
  const progressPct = Math.round((stepsDone / LIFECYCLE.length) * 100);

  // "Buy it again" — match order items back to live catalogue products by
  // title. Prices come from the catalogue (server data), never the client.
  const buyAgain = order.items
    .map((it) => PRODUCTS.find((p) => p.title === it.title))
    .filter((p): p is NonNullable<typeof p> => p !== undefined && p.state === "LIVE");

  return (
    <Shell
      active="/account/orders"
      breadcrumb={["My Account", "Orders", order.reference]}
      title={`Order ${order.reference}`}
      actions={
        <span className="vh-row" style={{ gap: 8 }}>
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href="#invoice">
            <span className="vh-row" style={{ gap: 6 }}><FileDown size={14} strokeWidth={2.2} aria-hidden />Download invoice</span>
          </a>
          {order.status === "DELIVERED" && (
            <a className="vh-btn vh-btn-sm vh-btn-danger" href="#return">
              <span className="vh-row" style={{ gap: 6 }}><RotateCcw size={14} strokeWidth={2.2} aria-hidden />Request return</span>
            </a>
          )}
        </span>
      }
    >
      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
          {/* Delivery progress summary */}
          <Card title={title(<Truck {...I} />, "Delivery progress")}>
            <div className="vh-row-between" style={{ marginBottom: 8 }}>
              <StatusPill tone={toneForStatus(order.status)}>{order.status.replace(/_/g, " ")}</StatusPill>
              {order.eta && <span className="small muted">ETA {order.eta}</span>}
            </div>
            <div
              style={{ height: 8, borderRadius: 999, background: "var(--vh-bg-subtle)", overflow: "hidden" }}
              role="img"
              aria-label={`Delivery ${progressPct}% complete — ${stepsDone} of ${LIFECYCLE.length} steps`}
            >
              <div style={{
                width: `${progressPct}%`, height: "100%", borderRadius: 999,
                background: order.status === "RETURNED" ? "var(--vh-danger)" : "var(--vh-accent)",
              }} />
            </div>
            <div className="vh-row-between small muted" style={{ marginTop: 8 }}>
              <span>{stepsDone} of {LIFECYCLE.length} steps complete</span>
              <span>Sold by {order.seller}</span>
            </div>
          </Card>

          <Card title={title(<Package {...I} />, "Items")}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {order.items.map((it, i) => (
                <li key={i} className="vh-row-between">
                  <span className="vh-row" style={{ gap: 12 }}>
                    <span aria-hidden style={{ fontSize: "1.6rem" }}>{it.emoji}</span>
                    <span>
                      <div style={{ fontWeight: 600 }}>{it.title}</div>
                      <div className="small muted">Qty {it.qty}</div>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={title(<Truck {...I} />, "Shipment timeline")}>
            <Timeline nodes={nodes} />
          </Card>

          {/* Buy it again */}
          {buyAgain.length > 0 && (
            <Card title={title(<RotateCcw {...I} />, "Buy it again")}>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                {buyAgain.map((p) => (
                  <li key={p.id} className="vh-row-between">
                    <span className="vh-row" style={{ gap: 12 }}>
                      <span aria-hidden style={{ fontSize: "1.4rem" }}>{p.emoji}</span>
                      <span>
                        <div className="small" style={{ fontWeight: 600 }}>{p.title}</div>
                        <div className="small muted">{p.seller} · ★ {p.rating}</div>
                      </span>
                    </span>
                    <span className="vh-row" style={{ gap: 8 }}>
                      <MoneyText paise={p.pricePaise} />
                      <span className="vh-btn vh-btn-sm vh-btn-primary" aria-disabled>Add to cart</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
          <Card>
            <div className="vh-row-between" style={{ marginBottom: 8 }}>
              <span className="small muted">Status</span>
              <StatusPill tone={toneForStatus(order.status)}>{order.status.replace(/_/g, " ")}</StatusPill>
            </div>
            {order.eta && (
              <div className="vh-row-between" style={{ marginBottom: 8 }}>
                <span className="small muted">Estimated delivery</span>
                <span className="small">{order.eta}</span>
              </div>
            )}
            <div className="vh-row-between" style={{ marginBottom: 8 }}>
              <span className="small muted">Seller</span>
              <span className="small">{order.seller}</span>
            </div>
            <div className="vh-row-between">
              <span className="small muted">Placed</span>
              <span className="small">{order.placedAt}</span>
            </div>
          </Card>

          <div id="invoice">
            <Card title={title(<Receipt {...I} />, "Price breakdown")}>
              <div className="vh-row-between" style={{ marginBottom: 8 }}>
                <span className="small muted">Subtotal</span>
                <MoneyText paise={subtotalPaise} />
              </div>
              <div className="vh-row-between" style={{ marginBottom: 8 }}>
                <span className="small muted">Tax (GST)</span>
                <MoneyText paise={taxPaise} />
              </div>
              <hr className="vh-divider" />
              <div className="vh-row-between" style={{ fontWeight: 700 }}>
                <span>Total</span>
                <MoneyText paise={order.totalPaise} />
              </div>
              <a className="vh-btn vh-btn-sm vh-btn-ghost" style={{ marginTop: 16, width: "100%", justifyContent: "center", display: "inline-flex", gap: 6 }} href="#invoice">
                <FileDown size={14} strokeWidth={2.2} aria-hidden />
                Download invoice (PDF)
              </a>
            </Card>
          </div>

          {/* Help CTA */}
          <Card title={title(<LifeBuoy {...I} />, "Need help with this order?")}>
            <p className="small muted" style={{ margin: "0 0 8px" }}>
              Wrong item, delayed delivery or a refund question — raise a ticket and reference{" "}
              <span className="mono">{order.reference}</span>. Refunds always reach you first; we recover
              from the seller afterwards.
            </p>
            <a className="vh-btn vh-btn-sm vh-btn-outline" href="/account/support">Contact support</a>
          </Card>

          {order.status === "DELIVERED" ? (
            <Banner severity="info" title="Return window open" icon="↩️">
              <span id="return">Eligible for return until 7 days after delivery.</span>{" "}
              <a href="#return">Start a return →</a>
            </Banner>
          ) : order.status === "RETURNED" ? (
            <Banner severity="ok" title="Return processed" icon="✅">
              Refund credited to your Wallet — see <a href="/account/wallet">Wallet</a>.
            </Banner>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
