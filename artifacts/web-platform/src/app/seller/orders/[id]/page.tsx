/**
 * VEDIC HEMP — SELLER ORDER DETAIL (§2.5)
 *
 * `params` is a Promise in Next 15 and must be awaited. The buyer's address
 * is masked here — full PII is not a seller-console default view. Refunds
 * always credit the buyer first; the marketplace recovers from the seller
 * afterwards ("buyers are never collateral").
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Printer, Undo2 } from "lucide-react";
import { Shell } from "../../Shell";
import { Card, StatusPill, toneForStatus, MoneyText, Timeline } from "@/components/ui";
import { findSellerOrder } from "../../_lib/data";
import { findOrder, ORDER_TONE } from "@/lib/orders";
import { fulfilOrder, sellerApproveReturn } from "../../actions";

const DEMO_STORE = "Vedic Botanicals";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (id.startsWith("live-")) return { title: `Order ${id.slice("live-".length)}` };
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

/** Real-order detail (order store): the seller sees only their own lines, a
 *  real fulfilment timeline, and a packing slip whose ship-to address is
 *  revealed only once the order is PACKED (label-generation time). */
async function RealSellerOrderDetail(reference: string) {
  const order = await findOrder(reference);
  if (!order) notFound();
  const myItems = order!.items.filter((it) => it.seller === DEMO_STORE);
  if (myItems.length === 0) notFound(); // not this store's order — absent, not 403
  const myTotal = myItems.reduce((n, it) => n + it.linePaise, 0);
  const revealed = ["PACKED", "SHIPPED", "DELIVERED"].includes(order!.status);
  const nextOp = order!.status === "PLACED" ? "accept" : order!.status === "ACCEPTED" ? "pack" : order!.status === "PACKED" ? "ship" : order!.status === "SHIPPED" ? "deliver" : null;
  const nextLabel = nextOp === "accept" ? "Accept" : nextOp === "pack" ? "Pack" : nextOp === "ship" ? "Mark shipped" : nextOp === "deliver" ? "Mark delivered" : null;
  const nodes = order!.timeline.map((e, i) => ({
    label: e.status.replace(/_/g, " "),
    state: (i === order!.timeline.length - 1 ? "current" : "done") as "done" | "current" | "pending" | "failed",
    at: e.at.slice(0, 10),
  }));
  const shipTo = revealed
    ? `${order!.city}${order!.state ? ", " + order!.state : ""} — ${order!.pincode}`
    : `${order!.city} — ${order!.pincode.slice(0, 3)}•••`;

  return (
    <Shell
      active="/seller/orders"
      breadcrumb={["Seller Central", "Orders", order!.reference]}
      title={`Order ${order!.reference}`}
      actions={
        <span className="vh-row" style={{ gap: 8 }}>
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href="#slip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Printer size={14} strokeWidth={2.2} aria-hidden /> Packing slip
          </a>
          {nextOp && nextLabel && (
            <form action={fulfilOrder} style={{ display: "inline-flex" }}>
              <input type="hidden" name="reference" value={order!.reference} />
              <input type="hidden" name="op" value={nextOp} />
              <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">{nextLabel}</button>
            </form>
          )}
        </span>
      }
    >
      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card title="Your items in this order">
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {myItems.map((it, i) => (
                <li key={i} className="vh-row-between">
                  <span className="vh-row" style={{ gap: 10 }}>
                    <span aria-hidden style={{ fontSize: "1.6rem" }}>{it.emoji}</span>
                    <span>
                      <div style={{ fontWeight: 600 }}>{it.title}{it.variantLabel ? ` · ${it.variantLabel}` : ""}</div>
                      <div className="small muted">Qty {it.qty} · <MoneyText paise={it.unitPaise} /> each</div>
                    </span>
                  </span>
                  <MoneyText paise={it.linePaise} />
                </li>
              ))}
            </ul>
            <div className="vh-row-between" style={{ borderTop: "1px solid var(--vh-line)", paddingTop: 8, marginTop: 8, fontWeight: 700 }}>
              <span>Your lines (GST-inclusive)</span>
              <MoneyText paise={myTotal} />
            </div>
          </Card>

          <Card title="Fulfilment timeline">
            <Timeline nodes={nodes} />
          </Card>

          {/* Packing slip — printable; ship-to revealed only once PACKED */}
          <div id="slip" style={{ scrollMarginTop: 90 }}>
            <Card title="Packing slip">
              <div className="small" style={{ display: "grid", gap: 4 }}>
                <div><strong>Order</strong> {order!.reference}</div>
                <div><strong>Placed</strong> {order!.placedAt.slice(0, 10)}</div>
                <div><strong>Ship to</strong> {shipTo}</div>
                {!revealed && <div className="muted">The full ship-to address is released when you mark the order packed — that&rsquo;s label-generation time.</div>}
              </div>
              <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 6 }}>
                {myItems.map((it, i) => (
                  <li key={i} className="small vh-row-between">
                    <span>{it.emoji} {it.title}{it.variantLabel ? ` · ${it.variantLabel}` : ""}</span>
                    <span className="tabular">× {it.qty}</span>
                  </li>
                ))}
              </ul>
              <p className="small muted" style={{ margin: "10px 0 0" }}>Use your browser&rsquo;s print to produce the slip.</p>
            </Card>
          </div>
        </div>

        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card>
            <div className="vh-row-between" style={{ marginBottom: 8 }}>
              <span className="small muted">Status</span>
              <StatusPill tone={ORDER_TONE[order!.status]}>{order!.status.replace(/_/g, " ")}</StatusPill>
            </div>
            <div className="vh-row-between">
              <span className="small muted">Buyer</span>
              <span className="small mono">{order!.buyerEmail.replace(/^(..).*(@.*)$/, "$1•••$2")}</span>
            </div>
          </Card>

          {order!.status === "RETURN_REQUESTED" && (
            <Card title="Return requested">
              <p className="small" style={{ marginTop: 0 }}>Reason: {order!.returnReason ?? "—"}</p>
              <form action={sellerApproveReturn}>
                <input type="hidden" name="reference" value={order!.reference} />
                <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Approve return</button>
              </form>
              <p className="small muted" style={{ margin: "8px 0 0" }}>
                The buyer is refunded first, on return receipt — the marketplace recovers from this store&rsquo;s next
                settlement afterwards. Buyers are never collateral.
              </p>
            </Card>
          )}
        </div>
      </div>
    </Shell>
  );
}

export default async function SellerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Real order from the order store (routed live-<reference>).
  if (id.startsWith("live-")) return RealSellerOrderDetail(id.slice("live-".length));

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
          <Link className="vh-btn vh-btn-sm vh-btn-primary" href="/seller/orders/labels" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Printer size={14} strokeWidth={2.2} aria-hidden /> Print label
          </Link>
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
              <Link id="label" className="vh-btn vh-btn-sm vh-btn-ghost" style={{ marginTop: 12, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }} href="/seller/orders/labels">
                <Printer size={14} strokeWidth={2.2} aria-hidden /> Print shipping label
              </Link>
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
