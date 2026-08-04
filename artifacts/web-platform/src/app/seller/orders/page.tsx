/**
 * VEDIC HEMP — SELLER ORDERS (§2.5)
 *
 * Every row here is a real order from the order store — a buyer's purchase that
 * contains at least one line from this storefront. The seller sees only their
 * own lines and their own share of the value; the rest of the basket is not
 * theirs to read. Accept → Pack → Ship → Deliver is a server-side state machine
 * (`advanceOrder`): the buttons only say what the next transition is, they never
 * decide it, and an unpaid order cannot be accepted at all.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Printer } from "lucide-react";
import { Shell } from "../Shell";
import { Card, DataTable, StatusPill, MoneyText, type Column } from "@/components/ui";
import { ORDER_TONE, ordersForSeller, sellerSubtotal, type Order, type OrderStatus } from "@/lib/orders";
import { actingStore } from "../_lib/store";
import { fulfilOrder, sellerApproveReturn } from "../actions";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

/** The statuses a seller filters by, in lifecycle order. */
const TABS = [
  "ALL", "PLACED", "ACCEPTED", "PACKED", "SHIPPED", "DELIVERED",
  "RETURN_REQUESTED", "RETURN_APPROVED", "RETURN_REJECTED", "REFUNDED", "CANCELLED",
] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL: Record<Tab, string> = {
  ALL: "All",
  PLACED: "New",
  ACCEPTED: "Accepted",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURN_REQUESTED: "Return asked",
  RETURN_APPROVED: "Return approved",
  RETURN_REJECTED: "Return refused",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

/** The next transition this seller can drive, or null. An order awaiting a real
 *  payment has none — `advanceOrder` refuses it server-side too. */
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

export default async function SellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const tab: Tab = TABS.includes(rawStatus as Tab) ? (rawStatus as Tab) : "ALL";

  const store = await actingStore();
  const orders = await ordersForSeller(store);
  const rows = tab === "ALL" ? orders : orders.filter((o) => o.status === (tab as OrderStatus));
  const toPrint = orders.filter((o) => o.status === "ACCEPTED" || o.status === "PACKED").length;

  const columns: Column<Order>[] = [
    {
      key: "reference", header: "Order", render: (o) => (
        <div>
          <div style={{ fontWeight: 600 }} className="mono">{o.reference}</div>
          <div className="small muted">{o.placedAt.slice(0, 10)} · {o.city}</div>
        </div>
      ),
    },
    {
      key: "buyer", header: "Buyer", render: (o) => (
        <span className="small mono">{o.buyerEmail.replace(/^(..).*(@.*)$/, "$1•••$2")}</span>
      ),
    },
    {
      key: "items", header: "Your lines", render: (o) => (
        <span className="small">{o.items.filter((it) => it.seller === store).map((it) => `${it.emoji} ${it.title} ×${it.qty}`).join(", ")}</span>
      ),
    },
    {
      key: "status", header: "Status", render: (o) => (
        <span className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
          <StatusPill tone={ORDER_TONE[o.status]}>{o.status.replace(/_/g, " ")}</StatusPill>
          {o.status === "PLACED" && o.paymentStatus !== "CAPTURED" && <StatusPill tone="warn">Payment pending</StatusPill>}
        </span>
      ),
    },
    { key: "total", header: "Your share", align: "right", render: (o) => <MoneyText paise={sellerSubtotal(o, store)} /> },
    {
      key: "actions", header: "", align: "right", render: (o) => {
        const next = nextOp(o);
        return (
          <span className="vh-row" style={{ gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            {next && (
              <form action={fulfilOrder} style={{ display: "inline-flex" }}>
                <input type="hidden" name="reference" value={o.reference} />
                <input type="hidden" name="op" value={next.op} />
                <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit" title={next.op === "ship" ? "Only after handover to your delivery partner" : undefined}>
                  {next.label}
                </button>
              </form>
            )}
            {o.status === "RETURN_REQUESTED" && (
              <form action={sellerApproveReturn} style={{ display: "inline-flex" }}>
                <input type="hidden" name="reference" value={o.reference} />
                <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit" title={`Return reason: ${o.returnReason ?? "—"}`}>Approve return</button>
              </form>
            )}
            <Link className="small" href={`/seller/orders/${o.reference}`}>Details →</Link>
          </span>
        );
      },
    },
  ];

  return (
    <Shell
      active="/seller/orders"
      breadcrumb={["Seller Central", "Orders"]}
      title="Orders"
      actions={
        <Link className="vh-btn vh-btn-sm vh-btn-primary" href="/seller/orders/labels" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Printer size={14} strokeWidth={2.2} aria-hidden /> Shipping labels{toPrint > 0 ? ` (${toPrint})` : ""}
        </Link>
      }
    >
      <div style={{ overflowX: "auto", marginBottom: "var(--sp-3)" }}>
        <nav className="vh-seg" aria-label="Order status filter">
          {TABS.map((t) => {
            const count = t === "ALL" ? orders.length : orders.filter((o) => o.status === (t as OrderStatus)).length;
            return (
              <Link
                key={t}
                href={t === "ALL" ? "/seller/orders" : `/seller/orders?status=${t}`}
                className={t === tab ? "on" : undefined}
                aria-current={t === tab ? "true" : undefined}
                style={{ whiteSpace: "nowrap" }}
              >
                {TAB_LABEL[t]} <span className="tabular muted">({count})</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <Card pad0>
        <DataTable
          columns={columns}
          rows={rows}
          empty={
            <div className="vh-empty">
              {tab === "ALL"
                ? "No orders yet — buyer purchases containing your listings land here for accept → pack → ship → deliver."
                : `No orders in ${TAB_LABEL[tab].toLowerCase()}.`}
            </div>
          }
        />
      </Card>
      <p className="small muted" style={{ marginTop: 8 }}>
        The buyer&rsquo;s delivery address stays withheld until you pack the order — that&rsquo;s label-generation time.
        An order still awaiting payment cannot be accepted: nothing ships before the money is captured. Refunds always
        credit the buyer first; recovery from this store happens afterwards, via settlement.
      </p>
    </Shell>
  );
}
