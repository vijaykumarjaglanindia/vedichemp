/**
 * VEDIC HEMP — SELLER ORDERS (§2.5)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Printer } from "lucide-react";
import { Shell } from "../Shell";
import { Card, DataTable, StatusPill, toneForStatus, MoneyText, type Column } from "@/components/ui";
import type { SampleOrder } from "@/lib/sample";
import { readSellerOrderOverrides } from "@/lib/engage";
import { ORDER_TONE, ordersForSeller } from "@/lib/orders";
import { SELLER_ORDERS, ORDER_STATUS_TABS } from "../_lib/data";
import { fulfilOrder, sellerApproveReturn, sellerOrderAction } from "../actions";

const DEMO_STORE = "Vedic Botanicals";

export const metadata: Metadata = { title: "Orders" };

/** Accept → Pack → Ship, one submit per transition; the action re-validates
 *  the state machine server-side (you can't pack what you never accepted). */
function OrderOpButton({ orderId, status }: { orderId: string; status: string }) {
  const op = status === "PENDING" ? "accept" : status === "ACCEPTED" ? "pack" : status === "PACKED" ? "ship" : null;
  if (!op) return null;
  const label = op === "accept" ? "Accept" : op === "pack" ? "Pack" : "Mark shipped";
  return (
    <form action={sellerOrderAction} style={{ display: "inline-flex" }}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="op" value={op} />
      <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit" title={op === "ship" ? "Only after handover to your delivery partner" : undefined}>
        {label}
      </button>
    </form>
  );
}

export default async function SellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = ORDER_STATUS_TABS.includes(rawStatus as (typeof ORDER_STATUS_TABS)[number])
    ? (rawStatus as (typeof ORDER_STATUS_TABS)[number])
    : "ALL";

  // Demo state: Accept/Pack/Ship transitions live in a server-written cookie
  // until the DB is attached; the sample rows are the baseline.
  const overrides = await readSellerOrderOverrides();
  const orders = SELLER_ORDERS.map((o) => ({ ...o, status: overrides[o.id] ?? o.status }));
  const rows = status === "ALL" ? orders : orders.filter((o) => o.status === status);
  const realOrders = await ordersForSeller(DEMO_STORE);

  const columns: Column<SampleOrder>[] = [
    { key: "reference", header: "Order", render: (o) => <div><div style={{ fontWeight: 600 }}>{o.reference}</div><div className="small muted">{o.placedAt}</div></div> },
    { key: "buyer", header: "Buyer", render: (o) => o.buyer ?? "—" },
    { key: "items", header: "Items", render: (o) => o.items.map((it) => `${it.emoji} ${it.title}`).join(", ") },
    { key: "status", header: "Status", render: (o) => <StatusPill tone={toneForStatus(o.status)}>{o.status.replace(/_/g, " ")}</StatusPill> },
    { key: "total", header: "Total", align: "right", render: (o) => <MoneyText paise={o.totalPaise} /> },
    {
      key: "actions", header: "", align: "right", render: (o) => (
        <span className="vh-row" style={{ gap: 8, justifyContent: "flex-end" }}>
          <OrderOpButton orderId={o.id} status={o.status} />
          <Link className="small" href={`/seller/orders/${o.id}`}>Details →</Link>
        </span>
      ),
    },
  ];

  return (
    <Shell
      active="/seller/orders"
      breadcrumb={["Seller Central", "Orders"]}
      title="Orders"
      actions={
        <Link className="vh-btn vh-btn-sm vh-btn-primary" href="/seller/orders/labels" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Printer size={14} strokeWidth={2.2} aria-hidden /> Bulk shipping labels
        </Link>
      }
    >
      <div style={{ overflowX: "auto", marginBottom: "var(--sp-3)" }}>
        <nav className="vh-seg" aria-label="Order status filter">
          {ORDER_STATUS_TABS.map((t) => {
            const count = t === "ALL" ? orders.length : orders.filter((o) => o.status === t).length;
            return (
              <Link
                key={t}
                href={t === "ALL" ? "/seller/orders" : `/seller/orders?status=${t}`}
                className={t === status ? "on" : undefined}
                aria-current={t === status ? "true" : undefined}
                style={{ whiteSpace: "nowrap" }}
              >
                {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()} <span className="tabular muted">({count})</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <Card pad0>
        <DataTable columns={columns} rows={rows} empty={<div className="vh-empty">No orders in this state.</div>} />
      </Card>
      <p className="small muted" style={{ marginTop: 8 }}>
        Buyer addresses stay masked until label generation. Refunds always credit the buyer first — recovery from
        this store happens afterwards, via settlement.
      </p>

      {/* ── Real orders (order store): live fulfilment + returns ── */}
      <div id="real-orders" style={{ marginTop: "var(--sp-5)", scrollMarginTop: 90 }}>
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><ClipboardList size={16} strokeWidth={2.2} aria-hidden /> Live orders &amp; returns</span>}
          action={<StatusPill tone={realOrders.length ? "info" : "ok"}>{realOrders.length} live</StatusPill>}
          pad0
        >
          {realOrders.length === 0 ? (
            <div className="vh-empty">No live orders yet — buyer purchases land here for accept → pack → ship → deliver.</div>
          ) : (
            <div style={{ display: "grid", gap: 0 }}>
              {realOrders.map((o) => {
                const myItems = o.items.filter((it) => it.seller === DEMO_STORE);
                const myTotal = myItems.reduce((n, it) => n + it.linePaise, 0);
                const nextOp = o.status === "PLACED" ? "accept" : o.status === "ACCEPTED" ? "pack" : o.status === "PACKED" ? "ship" : o.status === "SHIPPED" ? "deliver" : null;
                const nextLabel = nextOp === "accept" ? "Accept" : nextOp === "pack" ? "Pack" : nextOp === "ship" ? "Mark shipped" : nextOp === "deliver" ? "Mark delivered" : null;
                return (
                  <div key={o.reference} id={`ord-${o.reference}`} className="vh-row-between" style={{ gap: 12, padding: "12px 16px", borderTop: "1px solid var(--vh-line)", flexWrap: "wrap" }}>
                    <span style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{o.reference}</div>
                      <div className="small muted">{o.placedAt.slice(0, 10)} · {myItems.map((it) => `${it.emoji} ${it.title} ×${it.qty}`).join(", ")} · {o.city}</div>
                    </span>
                    <span className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                      <MoneyText paise={myTotal} />
                      <StatusPill tone={ORDER_TONE[o.status]}>{o.status.replace(/_/g, " ")}</StatusPill>
                      {nextOp && nextLabel && (
                        <form action={fulfilOrder} style={{ display: "inline-flex" }}>
                          <input type="hidden" name="reference" value={o.reference} />
                          <input type="hidden" name="op" value={nextOp} />
                          <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">{nextLabel}</button>
                        </form>
                      )}
                      {o.status === "RETURN_REQUESTED" && (
                        <form action={sellerApproveReturn} style={{ display: "inline-flex" }}>
                          <input type="hidden" name="reference" value={o.reference} />
                          <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit" title={`Return reason: ${o.returnReason}`}>Approve return</button>
                        </form>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <p className="small muted" style={{ marginTop: 8 }}>
          Approving a return does not touch the buyer&rsquo;s refund timing — the platform refunds the buyer first and
          recovers from this store afterwards (buyers are never collateral).
        </p>
      </div>
    </Shell>
  );
}
