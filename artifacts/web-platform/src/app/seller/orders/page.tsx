/**
 * VEDIC HEMP — SELLER ORDERS (§2.5)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Printer } from "lucide-react";
import { Shell } from "../Shell";
import { Card, DataTable, StatusPill, toneForStatus, MoneyText, type Column } from "@/components/ui";
import type { SampleOrder } from "@/lib/sample";
import { readSellerOrderOverrides } from "@/lib/engage";
import { SELLER_ORDERS, ORDER_STATUS_TABS } from "../_lib/data";
import { sellerOrderAction } from "../actions";

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
    </Shell>
  );
}
