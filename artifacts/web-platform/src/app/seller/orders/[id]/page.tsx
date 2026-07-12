/**
 * VEDIC HEMP — SELLER ORDER DETAIL (§2.5)
 *
 * `params` is a Promise in Next 15 and must be awaited. The buyer's address
 * is masked here — full PII is not a seller-console default view. Refunds
 * always credit the buyer first; the marketplace recovers from the seller
 * afterwards ("buyers are never collateral").
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, Printer, Undo2 } from "lucide-react";
import { Shell } from "../../Shell";
import { Card, StatusPill, toneForStatus, MoneyText, Timeline } from "@/components/ui";
import { findSellerOrder } from "../../_lib/data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const order = findSellerOrder(id);
  return { title: order ? `Order ${order.reference}` : "Order" };
}

const LIFECYCLE: { key: string; label: string }[] = [
  { key: "PENDING", label: "Order placed" },
  { key: "ACCEPTED", label: "Accepted by seller" },
  { key: "PACKED", label: "Packed" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

function maskAddress(buyer: string | undefined): string {
  const initial = buyer ? buyer.charAt(0) : "•";
  return `${initial}••••••• , Flat •••, •••• Layout, Bengaluru — 5600••`;
}

export default async function SellerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = findSellerOrder(id);
  if (!order) notFound();

  const taxPaise = Math.round(order.totalPaise * 0.05);
  const subtotalPaise = order.totalPaise - taxPaise;

  const currentIndex = order.status === "RETURNED" ? LIFECYCLE.length : LIFECYCLE.findIndex((s) => s.key === order.status);
  const nodes = LIFECYCLE.map((step, i) => ({
    label: step.label,
    state: (order.status === "RETURNED" ? "done" : i < currentIndex ? "done" : i === currentIndex ? "current" : "pending") as
      "done" | "current" | "pending" | "failed",
    at: i <= currentIndex ? order.placedAt : undefined,
  }));
  if (order.status === "RETURNED") {
    nodes.push({ label: "Returned by buyer", state: "failed", at: order.placedAt });
  }

  return (
    <Shell
      active="/seller/orders"
      breadcrumb={["Seller Central", "Orders", order.reference]}
      title={`Order ${order.reference}`}
      actions={
        <span className="vh-row" style={{ gap: 8 }}>
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href="#invoice" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Download size={14} strokeWidth={2.2} aria-hidden /> Invoice
          </a>
          <a className="vh-btn vh-btn-sm vh-btn-primary" href="/seller/orders/labels" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Printer size={14} strokeWidth={2.2} aria-hidden /> Print label
          </a>
        </span>
      }
    >
      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
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

          <Card title="Fulfilment timeline">
            <Timeline nodes={nodes} />
          </Card>

          <Card title="Buyer address (masked)">
            <div className="small" style={{ fontWeight: 600 }}>{order.buyer ?? "Buyer"}</div>
            <div className="small muted">{maskAddress(order.buyer)}</div>
            <div className="small muted" style={{ marginTop: 6 }}>Full address is revealed at label generation time only.</div>
          </Card>
        </div>

        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card>
            <div className="vh-row-between" style={{ marginBottom: 8 }}>
              <span className="small muted">Status</span>
              <StatusPill tone={toneForStatus(order.status)}>{order.status.replace(/_/g, " ")}</StatusPill>
            </div>
            {order.eta && (
              <div className="vh-row-between">
                <span className="small muted">ETA</span>
                <span className="small tabular">{order.eta}</span>
              </div>
            )}
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
              <a id="label" className="vh-btn vh-btn-sm vh-btn-ghost" style={{ marginTop: 12, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }} href="/seller/orders/labels">
                <Printer size={14} strokeWidth={2.2} aria-hidden /> Print shipping label
              </a>
            </Card>
          </div>

          {order.status === "RETURNED" && (
            <div className="vh-row" role="status" style={{ alignItems: "flex-start", gap: 10, border: "1px solid var(--vh-line)", borderLeft: "3px solid var(--vh-info)", borderRadius: "var(--vh-radius-sm)", padding: "12px 14px", background: "color-mix(in srgb, var(--vh-info-bg) 45%, var(--vh-surface))" }}>
              <Undo2 size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-info)", marginTop: 2, flexShrink: 0 }} />
              <div className="small">
                <strong>Refund note.</strong> The buyer is refunded first, immediately on return receipt — the
                marketplace recovers the amount from this store&rsquo;s next settlement afterwards. Buyers are never
                collateral for a seller-side dispute.
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
