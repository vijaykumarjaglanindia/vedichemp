/**
 * VEDIC HEMP — ORDERS LIST (§1.4)
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, DataTable, StatusPill, toneForStatus, MoneyText, type Column } from "@/components/ui";
import { ORDERS, type SampleOrder } from "@/lib/sample";

export const metadata: Metadata = { title: "Orders" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "delivered", label: "Delivered" },
  { key: "returned", label: "Returned" },
] as const;

const OPEN_STATUSES = new Set(["OUT_FOR_DELIVERY", "SHIPPED", "PACKED", "PENDING"]);

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter ?? "all";

  const rows = ORDERS.filter((o) => {
    if (filter === "open") return OPEN_STATUSES.has(o.status);
    if (filter === "delivered") return o.status === "DELIVERED";
    if (filter === "returned") return o.status === "RETURNED";
    return true;
  });

  const columns: Column<SampleOrder>[] = [
    {
      key: "reference", header: "Order", render: (o) => (
        <div>
          <div style={{ fontWeight: 600 }}>{o.reference}</div>
          <div className="small muted">{o.placedAt}</div>
        </div>
      ),
    },
    {
      key: "items", header: "Items", render: (o) => (
        <span className="vh-row" style={{ gap: 4 }}>
          {o.items.map((it, i) => (
            <span key={i} aria-hidden title={it.title} style={{ fontSize: "1.3rem" }}>{it.emoji}</span>
          ))}
          <span className="small muted">{o.items.length} item{o.items.length > 1 ? "s" : ""}</span>
        </span>
      ),
    },
    {
      key: "status", header: "Status", render: (o) => (
        <span className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
          <StatusPill tone={toneForStatus(o.status)}>{o.status.replace(/_/g, " ")}</StatusPill>
          {o.eta && <span className="small muted">ETA {o.eta}</span>}
        </span>
      ),
    },
    { key: "total", header: "Total", align: "right", render: (o) => <MoneyText paise={o.totalPaise} /> },
    {
      key: "actions", header: "", align: "right", render: (o) => (
        <span className="vh-row" style={{ gap: 8, justifyContent: "flex-end" }}>
          {o.status !== "DELIVERED" && o.status !== "RETURNED" && (
            <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/account/orders/${o.id}`}>Track</a>
          )}
          {o.status === "DELIVERED" && (
            <a className="vh-btn vh-btn-sm vh-btn-primary" href={`/account/orders/${o.id}`}>Buy again</a>
          )}
          <a className="small" href={`/account/orders/${o.id}`}>Details →</a>
        </span>
      ),
    },
  ];

  return (
    <Shell active="/account/orders" breadcrumb={["My Account", "Orders"]} title="Your orders">
      <div className="vh-row" style={{ gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <a
            key={f.key}
            href={f.key === "all" ? "/account/orders" : `/account/orders?filter=${f.key}`}
            className={`vh-pill ${f.key === filter ? "vh-pill-info" : "vh-pill-neutral"}`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <Card pad0>
        <DataTable columns={columns} rows={rows} empty={<div className="vh-empty">No orders match this filter.</div>} />
      </Card>
    </Shell>
  );
}
