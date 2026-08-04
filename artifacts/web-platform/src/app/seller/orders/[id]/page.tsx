/**
 * VEDIC HEMP — SELLER ORDER DETAIL (§2.5)
 *
 * One real order from the order store, seen from this storefront's side: only
 * its own lines, only its own share of the value. `params` is a Promise in Next
 * 15 and must be awaited. The buyer's delivery address is withheld until the
 * order is PACKED — that is label-generation time, and the only reason a seller
 * needs it. Refunds always credit the buyer first; the marketplace recovers
 * from the seller afterwards ("buyers are never collateral").
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Printer, Undo2 } from "lucide-react";
import { Shell } from "../../Shell";
import { Card, StatusPill, MoneyText, Timeline } from "@/components/ui";
import { actingStore } from "../../_lib/store";
import { findOrder, ORDER_TONE, sellerSubtotal, type Order } from "@/lib/orders";
import { fulfilOrder, sellerApproveReturn } from "../../actions";

/** Older links carried a `live-` prefix; keep them working. */
const refOf = (id: string) => (id.startsWith("live-") ? id.slice("live-".length) : id);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order ${refOf(id)}` };
}

function nextOp(o: Order): { op: string; label: string } | null {
  if (o.status === "PLACED" && o.paymentStatus !== "CAPTURED") return null;
  switch (o.status) {
    case "PLACED": return { op: "accept", label: "Accept" };
    case "ACCEPTED": return { op: "pack", label: "Pack" };
    case "PACKED": return { op: "ship", label: "Mark shipped" };
    case "SHIPPED": return { op: "deliver", label: "Mark delivered" };
    default: return null;
  }
}

export default async function SellerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await findOrder(refOf(id));
  if (!order) notFound();

  const store = await actingStore();
  const myItems = order.items.filter((it) => it.seller === store);
  // Not this store's order: absent, not 403 — a seller must not be able to
  // probe for another store's references.
  if (myItems.length === 0) notFound();

  const myTotal = sellerSubtotal(order, store);
  const revealed = ["PACKED", "SHIPPED", "DELIVERED", "RETURN_REQUESTED", "RETURN_APPROVED"].includes(order.status);
  const next = nextOp(order);
  const nodes = order.timeline.map((e, i) => ({
    label: e.status.replace(/_/g, " "),
    state: (i === order.timeline.length - 1 ? "current" : "done") as "done" | "current" | "pending" | "failed",
    at: e.at.slice(0, 10),
  }));

  const shipLines = revealed
    ? [
        order.shipName,
        order.shipLine1,
        `${order.city}${order.state ? ", " + order.state : ""} — ${order.pincode}`,
        order.shipMobile ? `☎ ${order.shipMobile}` : undefined,
      ].filter(Boolean) as string[]
    : [`${order.city} — ${order.pincode.slice(0, 3)}•••`];

  return (
    <Shell
      active="/seller/orders"
      breadcrumb={["Seller Central", "Orders", order.reference]}
      title={`Order ${order.reference}`}
      actions={
        <span className="vh-row" style={{ gap: 8 }}>
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href="#slip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Printer size={14} strokeWidth={2.2} aria-hidden /> Packing slip
          </a>
          {next && (
            <form action={fulfilOrder} style={{ display: "inline-flex" }}>
              <input type="hidden" name="reference" value={order.reference} />
              <input type="hidden" name="op" value={next.op} />
              <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">{next.label}</button>
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
            <p className="small muted" style={{ margin: "8px 0 0" }}>
              Your share of this order only. Other sellers&rsquo; lines, the buyer&rsquo;s coupon and the delivery charge
              are not yours to see.
            </p>
          </Card>

          <Card title="Fulfilment timeline">
            <Timeline nodes={nodes} />
          </Card>

          {/* Packing slip — printable; ship-to revealed only once PACKED */}
          <div id="slip" style={{ scrollMarginTop: 90 }}>
            <Card title="Packing slip">
              <div className="small" style={{ display: "grid", gap: 4 }}>
                <div><strong>Order</strong> <span className="mono">{order.reference}</span></div>
                <div><strong>Placed</strong> {order.placedAt.slice(0, 10)}</div>
                <div><strong>Ship to</strong></div>
                {shipLines.map((l) => <div key={l}>{l}</div>)}
                {!revealed && (
                  <div className="muted">
                    The full ship-to address is released when you mark the order packed — that&rsquo;s
                    label-generation time.
                  </div>
                )}
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
              <StatusPill tone={ORDER_TONE[order.status]}>{order.status.replace(/_/g, " ")}</StatusPill>
            </div>
            <div className="vh-row-between" style={{ marginBottom: 8 }}>
              <span className="small muted">Payment</span>
              <StatusPill tone={order.paymentStatus === "CAPTURED" ? "ok" : "warn"}>
                {order.paymentStatus === "CAPTURED" ? "Captured" : "Pending"}
              </StatusPill>
            </div>
            <div className="vh-row-between">
              <span className="small muted">Buyer</span>
              <span className="small mono">{order.buyerEmail.replace(/^(..).*(@.*)$/, "$1•••$2")}</span>
            </div>
            {order.status === "PLACED" && order.paymentStatus !== "CAPTURED" && (
              <p className="small muted" style={{ margin: "8px 0 0" }}>
                Nothing to do yet — the order can&rsquo;t be accepted until the payment is captured. The server
                refuses the transition either way.
              </p>
            )}
          </Card>

          {order.status === "RETURN_REQUESTED" && (
            <Card title="Return requested">
              <p className="small" style={{ marginTop: 0 }}>Reason: {order.returnReason ?? "—"}</p>
              <form action={sellerApproveReturn}>
                <input type="hidden" name="reference" value={order.reference} />
                <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Approve return</button>
              </form>
              <p className="small muted" style={{ margin: "8px 0 0" }}>
                The buyer is refunded first, on return receipt — the marketplace recovers from this store&rsquo;s next
                settlement afterwards. Buyers are never collateral.
              </p>
            </Card>
          )}

          {order.refundedPaise > 0 && (
            <div className="vh-row" role="status" style={{ alignItems: "flex-start", gap: 10, border: "1px solid var(--vh-line)", borderLeft: "3px solid var(--vh-info)", borderRadius: "var(--vh-radius-sm)", padding: "12px 14px", background: "color-mix(in srgb, var(--vh-info-bg) 45%, var(--vh-surface))" }}>
              <Undo2 size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-info)", marginTop: 2, flexShrink: 0 }} />
              <div className="small">
                <strong>Refunded <MoneyText paise={order.refundedPaise} />.</strong> The buyer was credited
                {order.refundedAt ? ` on ${order.refundedAt.slice(0, 10)}` : ""}; recovery from this store happens
                through settlement, and is currently {order.sellerRecovery.toLowerCase()}.
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
