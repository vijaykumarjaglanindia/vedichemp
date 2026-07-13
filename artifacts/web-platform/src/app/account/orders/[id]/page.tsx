/**
 * VEDIC HEMP — ORDER DETAIL (§1.4)
 *
 * A real order (routed `live-<reference>`) renders its genuine lifecycle from
 * the order store: a status-driven timeline, a cancel action while it is
 * pre-dispatch, a return request once delivered, and the refund state after.
 * Sample/illustrative orders keep their existing render. `params` is a
 * Promise in Next 15 and must be awaited; all money is server-computed paise.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { FileDown, LifeBuoy, Package, Receipt, RotateCcw, Truck, XCircle } from "lucide-react";
import { Shell } from "../../Shell";
import { Card, StatusPill, toneForStatus, MoneyText, Timeline, Banner } from "@/components/ui";
import { ORDERS, PRODUCTS, type SampleOrder } from "@/lib/sample";
import { readReturns } from "@/lib/engage";
import { getSession } from "@/lib/auth-lite";
import { findOrder, ORDER_TONE, type Order } from "@/lib/orders";
import { addToCart } from "../../../(site)/cart/actions";
import { cancelOwnOrder, requestReturn } from "../actions";

export const metadata: Metadata = { title: "Order details" };

const I = { size: 16, strokeWidth: 2.2 } as const;

function title(icon: ReactNode, text: string) {
  return (
    <span className="vh-row" style={{ gap: 8 }}>
      <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)" }}>{icon}</span>
      {text}
    </span>
  );
}

/* ── Real-order render (full lifecycle) ───────────────────── */

function RealOrderDetail({
  order,
  flags,
}: {
  order: Order;
  flags: { cancelled?: string; ret?: string; err?: string };
}) {
  const canCancel = ["PLACED", "ACCEPTED", "PACKED"].includes(order.status);
  const canReturn = order.status === "DELIVERED";
  const netPaid = order.totalPaise - order.refundedPaise;

  return (
    <Shell
      active="/account/orders"
      breadcrumb={["My Account", "Orders", order.reference]}
      title={`Order ${order.reference}`}
      actions={
        <span className="vh-row" style={{ gap: 8 }}>
          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/account/orders/live-${order.reference}/invoice`}>
            <span className="vh-row" style={{ gap: 6 }}><FileDown size={14} strokeWidth={2.2} aria-hidden />Download invoice</span>
          </Link>
          {canCancel && <a className="vh-btn vh-btn-sm vh-btn-ghost" href="#cancel"><span className="vh-row" style={{ gap: 6 }}><XCircle size={14} strokeWidth={2.2} aria-hidden />Cancel</span></a>}
          {canReturn && <a className="vh-btn vh-btn-sm vh-btn-danger" href="#return"><span className="vh-row" style={{ gap: 6 }}><RotateCcw size={14} strokeWidth={2.2} aria-hidden />Request return</span></a>}
        </span>
      }
    >
      {flags.cancelled && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="Order cancelled — you have been refunded">
            The full amount was refunded to you and the stock returned to the seller. You were refunded first, as always.
          </Banner>
        </div>
      )}
      {flags.ret === "ok" && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="Return requested">
            The seller reviews it and a pickup is arranged. Your refund is issued first — the platform recovers from
            the seller afterwards, never at your expense.
          </Banner>
        </div>
      )}
      {flags.err && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger" title="That didn't go through">
            {flags.err === "reason" ? "Give a return reason of at least 10 characters." : "That action isn't available in the order's current state."}
          </Banner>
        </div>
      )}

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
          <Card title={title(<Package {...I} />, "Items")}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {order.items.map((it, i) => (
                <li key={i} className="vh-row-between">
                  <span className="vh-row" style={{ gap: 12 }}>
                    <span aria-hidden style={{ fontSize: "1.6rem" }}>{it.emoji}</span>
                    <span>
                      <div style={{ fontWeight: 600 }}>{it.title}</div>
                      <div className="small muted">Qty {it.qty} · sold by {it.seller}</div>
                    </span>
                  </span>
                  <MoneyText paise={it.linePaise} />
                </li>
              ))}
            </ul>
          </Card>

          <div id="track" style={{ scrollMarginTop: 90 }}>
            <Card title={title(<Truck {...I} />, "Order timeline")}>
              <Timeline
                nodes={order.timeline.map((e, i) => ({
                  label: e.status.replace(/_/g, " "),
                  state: (i === order.timeline.length - 1 ? "current" : "done") as "done" | "current" | "pending" | "failed",
                  at: e.at.slice(0, 10),
                  ...(e.note ? { actor: e.note } : {}),
                }))}
              />
            </Card>
          </div>
        </div>

        <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
          <Card>
            <div className="vh-row-between" style={{ marginBottom: 8 }}>
              <span className="small muted">Status</span>
              <StatusPill tone={ORDER_TONE[order.status]}>{order.status.replace(/_/g, " ")}</StatusPill>
            </div>
            <div className="vh-row-between" style={{ marginBottom: 8 }}>
              <span className="small muted">Placed</span>
              <span className="small">{order.placedAt.slice(0, 10)}</span>
            </div>
            <div className="vh-row-between">
              <span className="small muted">Ship to</span>
              <span className="small">{order.city} · {order.pincode}</span>
            </div>
          </Card>

          <div id="invoice">
            <Card title={title(<Receipt {...I} />, "Price breakdown")}>
              <div className="vh-row-between" style={{ marginBottom: 8 }}><span className="small muted">Subtotal</span><MoneyText paise={order.subtotalPaise} /></div>
              {order.discountPaise > 0 && (
                <div className="vh-row-between" style={{ marginBottom: 8 }}><span className="small muted">Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span><span>−<MoneyText paise={order.discountPaise} /></span></div>
              )}
              <div className="vh-row-between" style={{ marginBottom: 8 }}><span className="small muted">Shipping</span><MoneyText paise={order.shippingPaise} /></div>
              <hr className="vh-divider" />
              <div className="vh-row-between" style={{ fontWeight: 700 }}><span>Total</span><MoneyText paise={order.totalPaise} /></div>
              {order.refundedPaise > 0 && (
                <>
                  <div className="vh-row-between" style={{ marginTop: 8, color: "var(--vh-accent)" }}><span className="small">Refunded to you</span><span>−<MoneyText paise={order.refundedPaise} /></span></div>
                  <div className="vh-row-between" style={{ fontWeight: 700 }}><span>Net paid</span><MoneyText paise={netPaid} /></div>
                </>
              )}
            </Card>
          </div>

          {order.status === "REFUNDED" && (
            <Banner severity="ok" title="Refund issued" icon="✅">
              The full amount was refunded to you. Recovery from the seller is a separate, internal step that never
              delays your money.
            </Banner>
          )}

          {canCancel && (
            <div id="cancel" style={{ scrollMarginTop: 90 }}>
              <Card title="Cancel this order">
                <p className="small muted" style={{ marginTop: 0 }}>
                  You can cancel any time before it ships. The full amount is refunded to you immediately and the
                  stock returns to the seller.
                </p>
                <form action={cancelOwnOrder}>
                  <input type="hidden" name="reference" value={order.reference} />
                  <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">
                    <XCircle size={14} strokeWidth={2.2} aria-hidden /> Cancel &amp; refund
                  </button>
                </form>
              </Card>
            </div>
          )}

          {canReturn && (
            <div id="return" style={{ scrollMarginTop: 90 }}>
              <Card title="Start a return">
                <p className="small muted" style={{ marginTop: 0 }}>
                  Eligible until 7 days after delivery. Refund-first: you are credited when the return is settled,
                  before any seller-side recovery.
                </p>
                <form action={requestReturn} className="vh-grid" style={{ gap: 10 }}>
                  <input type="hidden" name="reference" value={order.reference} />
                  <div className="vh-field">
                    <label className="vh-label" htmlFor="ret-reason">Reason <span className="req">*</span></label>
                    <select className="vh-select" id="ret-reason" name="reason" required defaultValue="">
                      <option value="" disabled>Choose a reason…</option>
                      <option value="Damaged in transit — outer seal broken on arrival">Damaged in transit</option>
                      <option value="Wrong item received against the order">Wrong item received</option>
                      <option value="Product expired or near expiry on arrival">Expired or near expiry</option>
                      <option value="Quality not as described on the listing">Quality not as described</option>
                    </select>
                  </div>
                  <button type="submit" className="vh-btn vh-btn-sm vh-btn-danger" style={{ justifySelf: "start" }}>
                    <RotateCcw size={14} strokeWidth={2.2} aria-hidden /> Request return
                  </button>
                </form>
              </Card>
            </div>
          )}

          {["RETURN_REQUESTED", "RETURN_APPROVED"].includes(order.status) && (
            <Banner severity="warn" title="Return in progress" icon="↩️">
              Reason: {order.returnReason}. Your refund is issued when it&rsquo;s settled — you are never the collateral.
            </Banner>
          )}
        </div>
      </div>
    </Shell>
  );
}

/* ── Sample-order render (illustrative history) ───────────── */

const LIFECYCLE: { key: string; label: string }[] = [
  { key: "PLACED", label: "Order placed" },
  { key: "PACKED", label: "Packed by seller" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ret?: string; cancelled?: string; err?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  // Real order path: `live-<reference>` backed by the order store.
  if (id.startsWith("live-")) {
    const reference = id.slice("live-".length);
    const session = await getSession();
    const real = await findOrder(reference);
    if (real && real.buyerEmail === (session?.email ?? "guest@vedichemp.in")) {
      return <RealOrderDetail order={real} flags={sp} />;
    }
  }

  const { ret } = sp;
  const returnRequest = (await readReturns())[id];
  const order: SampleOrder | undefined = ORDERS.find((o) => o.id === id);
  if (!order) notFound();

  const taxPaise = Math.round(order.totalPaise * 0.05);
  const subtotalPaise = order.totalPaise - taxPaise;
  const currentIndex = order.status === "RETURNED" ? LIFECYCLE.length : LIFECYCLE.findIndex((s) => s.key === order.status);
  const nodes = LIFECYCLE.map((step, i) => ({
    label: step.label,
    state: (order.status === "RETURNED" ? "done" : i < currentIndex ? "done" : i === currentIndex ? "current" : "pending") as "done" | "current" | "pending" | "failed",
    at: i <= currentIndex ? order.placedAt : undefined,
  }));
  if (order.status === "RETURNED") nodes.push({ label: "Returned to seller", state: "failed", at: order.placedAt });
  const stepsDone = order.status === "RETURNED" ? LIFECYCLE.length : Math.max(currentIndex + 1, 1);
  const progressPct = Math.round((stepsDone / LIFECYCLE.length) * 100);
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
          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/account/orders/${id}/invoice`}>
            <span className="vh-row" style={{ gap: 6 }}><FileDown size={14} strokeWidth={2.2} aria-hidden />Download invoice</span>
          </Link>
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
          <Card title={title(<Truck {...I} />, "Delivery progress")}>
            <div className="vh-row-between" style={{ marginBottom: 8 }}>
              <StatusPill tone={toneForStatus(order.status)}>{order.status.replace(/_/g, " ")}</StatusPill>
              {order.eta && <span className="small muted">ETA {order.eta}</span>}
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "var(--vh-bg-subtle)", overflow: "hidden" }} role="img" aria-label={`Delivery ${progressPct}% complete`}>
              <div style={{ width: `${progressPct}%`, height: "100%", borderRadius: 999, background: order.status === "RETURNED" ? "var(--vh-danger)" : "var(--vh-accent)" }} />
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

          <div id="track" style={{ scrollMarginTop: 90 }}>
            <Card title={title(<Truck {...I} />, "Shipment timeline")}>
              <Timeline nodes={nodes} />
            </Card>
          </div>

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
                      <form action={addToCart}>
                        <input type="hidden" name="productId" value={p.id} />
                        <button type="submit" className="vh-btn vh-btn-sm vh-btn-primary">Add to cart</button>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
          <div id="invoice">
            <Card title={title(<Receipt {...I} />, "Price breakdown")}>
              <div className="vh-row-between" style={{ marginBottom: 8 }}><span className="small muted">Subtotal</span><MoneyText paise={subtotalPaise} /></div>
              <div className="vh-row-between" style={{ marginBottom: 8 }}><span className="small muted">Tax (GST)</span><MoneyText paise={taxPaise} /></div>
              <hr className="vh-divider" />
              <div className="vh-row-between" style={{ fontWeight: 700 }}><span>Total</span><MoneyText paise={order.totalPaise} /></div>
            </Card>
          </div>

          <Card title={title(<LifeBuoy {...I} />, "Need help with this order?")}>
            <p className="small muted" style={{ margin: "0 0 8px" }}>
              Reference <span className="mono">{order.reference}</span>. Refunds always reach you first; we recover
              from the seller afterwards.
            </p>
            <Link className="vh-btn vh-btn-sm vh-btn-outline" href="/account/support">Contact support</Link>
          </Card>

          {order.status === "DELIVERED" && returnRequest ? (
            <div id="return" style={{ scrollMarginTop: 90 }}>
              <Banner severity="ok" title="Return requested" icon="↩️">
                Reason: {returnRequest.reason} · requested {returnRequest.at}. Your refund is issued on pickup
                confirmation — recovery from the seller happens afterwards, never at your expense.
              </Banner>
            </div>
          ) : order.status === "DELIVERED" ? (
            <div id="return" style={{ scrollMarginTop: 90 }}>
              <Card title="Start a return">
                {ret === "reason" && <div style={{ marginBottom: 10 }}><Banner severity="danger">Pick a return reason first.</Banner></div>}
                <p className="small muted" style={{ marginTop: 0 }}>Eligible until 7 days after delivery. Refund-first.</p>
                <form action={requestReturn} className="vh-row" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <div className="vh-field" style={{ minWidth: 220 }}>
                    <label className="vh-label" htmlFor="ret-reason">Reason <span className="req">*</span></label>
                    <select className="vh-select" id="ret-reason" name="reason" required defaultValue="">
                      <option value="" disabled>Choose a reason…</option>
                      <option value="Damaged in transit — outer seal broken">Damaged in transit</option>
                      <option value="Wrong item received against the order">Wrong item received</option>
                      <option value="Quality not as described on the listing">Quality not as described</option>
                    </select>
                  </div>
                  <button type="submit" className="vh-btn vh-btn-sm vh-btn-danger"><RotateCcw size={14} strokeWidth={2.2} aria-hidden /> Request return</button>
                </form>
              </Card>
            </div>
          ) : order.status === "RETURNED" ? (
            <Banner severity="ok" title="Return processed" icon="✅">
              Refund credited to your Wallet — see <Link href="/account/wallet">Wallet</Link>.
            </Banner>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
