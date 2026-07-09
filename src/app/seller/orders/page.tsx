/**
 * VEDIC HEMP — SELLER ORDERS (§2.5)
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, DataTable, StatusPill, toneForStatus, MoneyText, type Column } from "@/components/ui";
import type { SampleOrder } from "@/lib/sample";
import { SELLER_ORDERS, ORDER_STATUS_TABS } from "../_lib/data";

export const metadata: Metadata = { title: "Orders" };

export default async function SellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = ORDER_STATUS_TABS.includes(rawStatus as (typeof ORDER_STATUS_TABS)[number])
    ? (rawStatus as (typeof ORDER_STATUS_TABS)[number])
    : "ALL";

  const rows = status === "ALL" ? SELLER_ORDERS : SELLER_ORDERS.filter((o) => o.status === status);

  const columns: Column<SampleOrder>[] = [
    { key: "reference", header: "Order", render: (o) => <div><div style={{ fontWeight: 600 }}>{o.reference}</div><div className="small muted">{o.placedAt}</div></div> },
    { key: "buyer", header: "Buyer", render: (o) => o.buyer ?? "—" },
    { key: "items", header: "Items", render: (o) => o.items.map((it) => `${it.emoji} ${it.title}`).join(", ") },
    { key: "status", header: "Status", render: (o) => <StatusPill tone={toneForStatus(o.status)}>{o.status.replace(/_/g, " ")}</StatusPill> },
    { key: "total", header: "Total", align: "right", render: (o) => <MoneyText paise={o.totalPaise} /> },
    {
      key: "actions", header: "", align: "right", render: (o) => (
        <span className="vh-row" style={{ gap: 8, justifyContent: "flex-end" }}>
          {o.status === "PENDING" && <button className="vh-btn vh-btn-sm vh-btn-primary" type="button">Accept</button>}
          {o.status === "ACCEPTED" && <button className="vh-btn vh-btn-sm vh-btn-primary" type="button">Pack</button>}
          <a className="small" href={`/seller/orders/${o.id}`}>Details →</a>
        </span>
      ),
    },
  ];

  return (
    <Shell
      active="/seller/orders"
      breadcrumb={["Seller Central", "Orders"]}
      title="Orders"
      actions={<button className="vh-btn vh-btn-sm vh-btn-ghost" type="button">Generate shipping labels (bulk)</button>}
    >
      <div className="vh-row" style={{ gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {ORDER_STATUS_TABS.map((t) => (
          <a
            key={t}
            href={t === "ALL" ? "/seller/orders" : `/seller/orders?status=${t}`}
            className={`vh-pill ${t === status ? "vh-pill-info" : "vh-pill-neutral"}`}
          >
            {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
            {" "}({t === "ALL" ? SELLER_ORDERS.length : SELLER_ORDERS.filter((o) => o.status === t).length})
          </a>
        ))}
      </div>

      <Card pad0>
        <DataTable columns={columns} rows={rows} empty={<div className="vh-empty">No orders in this state.</div>} />
      </Card>
    </Shell>
  );
}
