/**
 * VEDIC HEMP — ORDER DETAIL (§1.4)
 *
 * Only a real order renders here — routed `live-<reference>`, read from the
 * order store and gated to the buyer who placed it. It shows that order's
 * genuine lifecycle: a status-driven timeline, a cancel action while it is
 * pre-dispatch, a return request once delivered, and the refund state after.
 * `params` is a Promise in Next 15 and must be awaited; every figure is
 * server-computed paise from the order itself — nothing is derived for display.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { FileDown, LifeBuoy, Package, Receipt, RotateCcw, ShoppingCart, Truck, XCircle } from "lucide-react";
import { Shell } from "../../Shell";
import { Card, StatusPill, MoneyText, Timeline, Banner } from "@/components/ui";
import { getSession } from "@/lib/auth-lite";
import { findOrder, ORDER_TONE, type Order } from "@/lib/orders";
import { reorder } from "../../../(site)/cart/actions";
import { cancelOwnOrder, reportSideEffect, requestReturn } from "../actions";

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

/* ── Order render (full lifecycle) ────────────────────────── */

async function RealOrderDetail({
  order,
  flags,
}: {
  order: Order;
  flags: { cancelled?: string; ret?: string; err?: string; ae?: string; reorder?: string };
}) {
  const canCancel = ["PLACED", "ACCEPTED", "PACKED"].includes(order.status);
  // The return window is the operator's setting; the same value gates the
  // server-side request, so the button is never offered for an order the
  // server would refuse.
  const { readCommerce } = await import("@/lib/commerce");
  const returnWindowDays = (await readCommerce()).returnWindowDays;
  const { readReturnReasons } = await import("@/lib/commerce");
  const returnReasons = await readReturnReasons();
  const deliveredAt = [...order.timeline].reverse().find((e) => e.status === "DELIVERED")?.at;
  const withinWindow = !deliveredAt || Date.now() - Date.parse(deliveredAt) <= returnWindowDays * 86_400_000;
  const canReturn = order.status === "DELIVERED" && withinWindow;
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
          <form action={reorder} style={{ display: "inline-flex" }}>
            <input type="hidden" name="reference" value={order.reference} />
            <button type="submit" className="vh-btn vh-btn-sm vh-btn-primary">
              <span className="vh-row" style={{ gap: 6 }}><ShoppingCart size={14} strokeWidth={2.2} aria-hidden />Buy again</span>
            </button>
          </form>
          {canCancel && <a className="vh-btn vh-btn-sm vh-btn-ghost" href="#cancel"><span className="vh-row" style={{ gap: 6 }}><XCircle size={14} strokeWidth={2.2} aria-hidden />Cancel</span></a>}
          {canReturn && <a className="vh-btn vh-btn-sm vh-btn-danger" href="#return"><span className="vh-row" style={{ gap: 6 }}><RotateCcw size={14} strokeWidth={2.2} aria-hidden />Request return</span></a>}
        </span>
      }
    >
      {order.paymentStatus === "PENDING" && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="info" title="Payment pending">
            We haven&rsquo;t received your payment for this order yet. It confirms automatically the moment your payment
            goes through — the seller ships only after that. If you closed the payment page, you can safely retry the
            payment; you will never be charged twice for the same order.
          </Banner>
        </div>
      )}
      {flags.reorder === "none" && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="info" title="Nothing from this order is available right now">
            None of these items are currently in stock, so nothing was added to your cart. Browse the
            catalogue for alternatives.
          </Banner>
        </div>
      )}
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
                      <div style={{ fontWeight: 600 }}>{it.title}{it.variantLabel ? ` — ${it.variantLabel}` : ""}</div>
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
                  Eligible until {returnWindowDays} day{returnWindowDays === 1 ? "" : "s"} after delivery.
                  Refund-first: you are credited when the return is settled, before any seller-side recovery.
                </p>
                <form action={requestReturn} className="vh-grid" style={{ gap: 10 }}>
                  <input type="hidden" name="reference" value={order.reference} />
                  <div className="vh-field">
                    <label className="vh-label" htmlFor="ret-reason">Reason <span className="req">*</span></label>
                    <select className="vh-select" id="ret-reason" name="reason" required defaultValue="">
                      <option value="" disabled>Choose a reason…</option>
                      {returnReasons.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="vh-btn vh-btn-sm vh-btn-danger" style={{ justifySelf: "start" }}>
                    <RotateCcw size={14} strokeWidth={2.2} aria-hidden /> Request return
                  </button>
                </form>
              </Card>
            </div>
          )}

          {/* Report a side effect — pharmacovigilance (any real order, no time limit) */}
          <div id="safety" style={{ scrollMarginTop: 90 }}>
              <Card title={title(<LifeBuoy {...I} />, "Report a side effect")}>
                {flags.ae === "ok" ? (
                  <Banner severity="ok" title="Thank you — report received">
                    Our safety team reviews every report. What you shared is treated as confidential health information
                    and is only seen by our compliance pharmacists.
                  </Banner>
                ) : (
                  <>
                    {flags.ae === "short" && <p className="small" role="alert" style={{ color: "var(--vh-danger)", margin: "0 0 8px" }}>Please describe what happened (at least 12 characters).</p>}
                    {flags.ae === "severity" && <p className="small" role="alert" style={{ color: "var(--vh-danger)", margin: "0 0 8px" }}>Please choose how serious it was.</p>}
                    <p className="small muted" style={{ marginTop: 0 }}>
                      If a product from this order caused an unexpected reaction, tell us. This is confidential — only our
                      compliance pharmacists see it — and it never expires like the return window.
                    </p>
                    <form action={reportSideEffect} className="vh-grid" style={{ gap: 10 }}>
                      <input type="hidden" name="reference" value={order.reference} />
                      <div className="vh-field">
                        <label className="vh-label" htmlFor="ae-severity">How serious was it?</label>
                        <select className="vh-select" id="ae-severity" name="severity" defaultValue="">
                          <option value="" disabled>Choose…</option>
                          <option value="MILD">Mild — noticeable but manageable</option>
                          <option value="MODERATE">Moderate — needed attention</option>
                          <option value="SEVERE">Severe — needed medical care</option>
                        </select>
                      </div>
                      <div className="vh-field">
                        <label className="vh-label" htmlFor="ae-narrative">What happened?</label>
                        <textarea className="vh-input" id="ae-narrative" name="narrative" rows={3} maxLength={1000} required placeholder="Describe the reaction, when it started, and which product you think caused it." />
                      </div>
                      <button type="submit" className="vh-btn vh-btn-sm vh-btn-outline" style={{ justifySelf: "start" }}>Submit report</button>
                    </form>
                  </>
                )}
              </Card>
            </div>

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

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ret?: string; cancelled?: string; err?: string; ae?: string; reorder?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  // The only order detail there is: a real order, routed `live-<reference>`.
  if (!id.startsWith("live-")) notFound();
  const session = await getSession();
  // An unverifiable session cookie passes the edge middleware; it must never
  // resolve to a substitute identity whose order would then be rendered.
  if (!session?.email) redirect(`/signin?next=/account/orders/${id}`);
  const order = await findOrder(id.slice("live-".length));
  if (!order || order.buyerEmail.toLowerCase() !== session.email.toLowerCase()) notFound();

  return <RealOrderDetail order={order} flags={sp} />;
}
