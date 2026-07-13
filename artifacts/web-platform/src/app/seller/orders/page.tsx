/**
 * VEDIC HEMP — SELLER ORDERS (§2.5)
 */

import type { Metadata } from "next";
import { Printer } from "lucide-react";
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
      actions={
        <button className="vh-btn vh-btn-sm vh-btn-primary" type="button" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Printer size={14} strokeWidth={2.2} aria-hidden /> Bulk shipping labels
        </button>
      }
    >
      <div style={{ overflowX: "auto", marginBottom: "var(--sp-3)" }}>
        <nav className="vh-seg" aria-label="Order status filter">
          {ORDER_STATUS_TABS.map((t) => {
            const count = t === "ALL" ? SELLER_ORDERS.length : SELLER_ORDERS.filter((o) => o.status === t).length;
            return (
              <a
                key={t}
                href={t === "ALL" ? "/seller/orders" : `/seller/orders?status=${t}`}
                className={t === status ? "on" : undefined}
                aria-current={t === status ? "true" : undefined}
                style={{ whiteSpace: "nowrap" }}
              >
                {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()} <span className="tabular muted">({count})</span>
              </a>
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
