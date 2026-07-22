/**
 * VEDIC HEMP — ORDERS LIST (§1.4)
 *
 * The status filter is a server-driven searchParam (?filter=…) — the segmented
 * control is plain links, so filtering works without JavaScript and the server
 * stays the authority on what is shown.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Eye, FileDown, MapPin } from "lucide-react";
import { Shell } from "../Shell";
import { Card, DataTable, StatusPill, toneForStatus, MoneyText, type Column } from "@/components/ui";
import { ORDERS, type SampleOrder } from "@/lib/sample";
import { readReturns } from "@/lib/engage";
import { getSession } from "@/lib/auth-lite";
import { ordersForBuyer } from "@/lib/orders";

export const metadata: Metadata = { title: "Orders" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "delivered", label: "Delivered" },
  { key: "returned", label: "Returned" },
] as const;

const OPEN_STATUSES = new Set(["OUT_FOR_DELIVERY", "SHIPPED", "PACKED", "PENDING", "PLACED", "ACCEPTED"]);

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter ?? "all";

  // Real orders from the order store, scoped to this buyer, routed as
  // `live-<reference>`. They carry a genuine lifecycle status set by
  // fulfilment/return actions — not a fixed PENDING.
  const session = await getSession();
  const placed: SampleOrder[] = (await ordersForBuyer(session?.email ?? "guest@vedichemp.in")).map((o) => ({
    id: `live-${o.reference}`,
    reference: o.reference,
    placedAt: o.placedAt.slice(0, 10),
    status: o.status,
    totalPaise: o.totalPaise,
    items: o.items.map(({ title, qty, emoji }) => ({ title, qty, emoji })),
    eta: o.status === "DELIVERED" || o.status === "REFUNDED" || o.status === "CANCELLED" ? undefined : "3–5 days",
    seller: o.items[0]?.seller,
  }));

  const returns = await readReturns();
  // The buyer's real checkout orders, prepended to the illustrative sample
  // history (src/lib/sample.ts — the documented demo seam that lets the console
  // be reviewed with realistic content until a live order DB is attached).
  const rows = [...placed, ...ORDERS]
    .map((o) => (returns[o.id] ? { ...o, status: "RETURN_REQUESTED" } : o))
    .filter((o) => {
    if (filter === "open") return OPEN_STATUSES.has(o.status);
    if (filter === "delivered") return o.status === "DELIVERED";
    if (filter === "returned") return ["RETURNED", "RETURN_REQUESTED", "RETURN_APPROVED", "REFUNDED", "CANCELLED"].includes(o.status);
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
            <Link
              className="vh-btn vh-btn-sm vh-btn-ghost"
              href={`/account/orders/${o.id}`}
              aria-label={`Track order ${o.reference}`}
              title="Track"
            >
              <MapPin size={14} strokeWidth={2.2} aria-hidden />
            </Link>
          )}
          {o.status === "DELIVERED" && (
            <Link className="vh-btn vh-btn-sm vh-btn-primary" href={`/account/orders/${o.id}`}>Buy again</Link>
          )}
          <Link
            className="vh-btn vh-btn-sm vh-btn-ghost"
            href={`/account/orders/${o.id}/invoice`}
            aria-label={`Download invoice for order ${o.reference}`}
            title="Download invoice"
          >
            <FileDown size={14} strokeWidth={2.2} aria-hidden />
          </Link>
          <Link
            className="vh-btn vh-btn-sm vh-btn-ghost"
            href={`/account/orders/${o.id}`}
            aria-label={`View details of order ${o.reference}`}
            title="Details"
          >
            <Eye size={14} strokeWidth={2.2} aria-hidden />
          </Link>
        </span>
      ),
    },
  ];

  return (
    <Shell active="/account/orders" breadcrumb={["My Account", "Orders"]} title="Your orders">
      {/* Toolbar: segmented status filter (server-driven via ?filter=) */}
      <div className="vh-row-between" style={{ marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <nav className="vh-seg" aria-label="Filter orders by status">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/account/orders" : `/account/orders?filter=${f.key}`}
              className={f.key === filter ? "on" : undefined}
              aria-current={f.key === filter ? "true" : undefined}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <span className="small muted tabular">
          {rows.length} order{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      <Card pad0>
        <DataTable columns={columns} rows={rows} empty={<div className="vh-empty">No orders match this filter.</div>} />
      </Card>
    </Shell>
  );
}
