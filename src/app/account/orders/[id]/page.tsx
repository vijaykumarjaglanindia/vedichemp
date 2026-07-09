/**
 * VEDIC HEMP — ORDER DETAIL (§1.4)
 *
 * `params` is a Promise in Next 15 route handlers/pages and must be awaited.
 * All money on this page is server-computed paise, rendered via <MoneyText>.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Shell } from "../../Shell";
import { Card, StatusPill, toneForStatus, MoneyText, Timeline, Banner } from "@/components/ui";
import { ORDERS } from "@/lib/sample";

export const metadata: Metadata = { title: "Order details" };

const LIFECYCLE: { key: string; label: string }[] = [
  { key: "PLACED", label: "Order placed" },
  { key: "PACKED", label: "Packed by seller" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

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

  return (
    <Shell
      active="/account/orders"
      breadcrumb={["My Account", "Orders", order.reference]}
      title={`Order ${order.reference}`}
      actions={
        <span className="vh-row" style={{ gap: 8 }}>
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href="#invoice">Download invoice</a>
          {order.status === "DELIVERED" && <a className="vh-btn vh-btn-sm vh-btn-danger" href="#return">Request return</a>}
        </span>
      }
    >
      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <div className="vh-grid" style={{ gap: 18 }}>
          <Card title="Items">
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {order.items.map((it, i) => (
                <li key={i} className="vh-row-between">
                  <span className="vh-row" style={{ gap: 10 }}>
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

          <Card title="Shipment timeline">
            <Timeline nodes={nodes} />
          </Card>
        </div>

        <div className="vh-grid" style={{ gap: 18 }}>
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
          </Card>

          <div id="invoice">
            <Card title="Price breakdown">
              <div className="vh-row-between" style={{ marginBottom: 6 }}>
                <span className="small muted">Subtotal</span>
                <MoneyText paise={subtotalPaise} />
              </div>
              <div className="vh-row-between" style={{ marginBottom: 6 }}>
                <span className="small muted">Tax (GST)</span>
                <MoneyText paise={taxPaise} />
              </div>
              <div className="vh-row-between" style={{ borderTop: "1px solid var(--vh-line)", paddingTop: 8, fontWeight: 700 }}>
                <span>Total</span>
                <MoneyText paise={order.totalPaise} />
              </div>
              <a className="vh-btn vh-btn-sm vh-btn-ghost" style={{ marginTop: 12, width: "100%", textAlign: "center" }} href="#invoice">
                Download invoice (PDF)
              </a>
            </Card>
          </div>

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
