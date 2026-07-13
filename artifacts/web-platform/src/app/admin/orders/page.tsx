/**
 * VEDIC HEMP — ORDER OPERATIONS (§0.4)
 *
 * All orders across sellers, plus returns/refunds/disputes. Refunds are the
 * money-moving action on this page: the reviewing admin is always the maker;
 * any refund at or above ₹5,000 needs a second admin as checker before it
 * posts (A6), and the platform refunds the buyer first, recovering from the
 * seller afterwards ("buyers are never collateral").
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Undo2, Scale, Truck, UsersRound } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus, MoneyText, Banner, DataTable, type Column } from "@/components/ui";
import { BarList } from "@/components/ui/charts";
import { ORDERS, type SampleOrder } from "@/lib/sample";
import { COURIER_SCORECARD } from "../_lib/data";

export const metadata: Metadata = { title: "Orders · Admin" };

const I = { size: 16, strokeWidth: 2.2 } as const;
const IB = { size: 14, strokeWidth: 2.2 } as const;

const REFUND_CHECKER_THRESHOLD_PAISE = 500_000; // ₹5,000 — mirrors assertCheckerPresent()

// Exception filters — presentation only; the server owns each definition.
const EXCEPTION_FILTERS = [
  { id: "all", label: "All orders", active: true },
  { id: "refunds", label: "Refund requests", active: false },
  { id: "disputes", label: "Disputes", active: false },
  { id: "rto", label: "RTO / undelivered", active: false },
  { id: "sla", label: "SLA breaches", active: false },
];

const columns: Column<SampleOrder>[] = [
  { key: "ref", header: "Order", render: (o) => (
      <div>
        <div className="mono" style={{ fontWeight: 600 }}>{o.reference}</div>
        <div className="small muted">{o.placedAt}</div>
      </div>
    ) },
  { key: "buyer", header: "Buyer", render: (o) => o.buyer ?? "—" },
  { key: "seller", header: "Seller", render: (o) => o.seller ?? "—" },
  { key: "items", header: "Items", render: (o) => (
      <span className="small">{o.items.map((it) => `${it.emoji} ${it.title}`).join(", ")}</span>
    ) },
  { key: "status", header: "Status", render: (o) => <StatusPill tone={toneForStatus(o.status)}>{o.status.replace(/_/g, " ")}</StatusPill> },
  { key: "total", header: "Total", align: "right", render: (o) => <MoneyText paise={o.totalPaise} /> },
  { key: "actions", header: "Actions", render: (o) => {
      const needsChecker = o.totalPaise >= REFUND_CHECKER_THRESHOLD_PAISE;
      return (
        <div className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/orders#${o.id}`}>
            <Eye {...IB} aria-hidden /> View
          </Link>
          <Link className="vh-btn vh-btn-sm vh-btn-danger" href={`/admin/orders#${o.id}-refund`}>
            <Undo2 {...IB} aria-hidden /> {needsChecker ? "Refund (needs checker — A6)" : "Refund"}
          </Link>
        </div>
      );
    } },
];

export default function AdminOrdersPage() {
  const disputed = ORDERS.filter((o) => o.status === "RETURNED");

  return (
    <Shell active="/admin/orders" breadcrumb={["Admin", "Orders"]} title="Orders, returns & refunds">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Banner severity="info" title="Buyer-first refunds">
          When an order is disputed, the buyer is refunded first from the platform&apos;s settlement float; recovery
          from the seller (via the next settlement run) happens afterwards. A buyer never waits on a seller dispute
          to be resolved to get their money back.
        </Banner>

        {/* Exception segment filter */}
        <div className="vh-seg" role="navigation" aria-label="Order exception filters">
          {EXCEPTION_FILTERS.map((f) => (
            <Link
              key={f.id}
              href={`/admin/orders#${f.id}`}
              className={f.active ? "on" : undefined}
              aria-current={f.active ? "page" : undefined}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <Card title="All orders" pad0>
          <DataTable columns={columns} rows={ORDERS} />
        </Card>

        <div className="vh-grid cols-2">
          <Card
            title={<span className="vh-row" style={{ gap: 8 }}><Scale {...I} aria-hidden /> Returns & disputes</span>}
            action={<StatusPill tone={disputed.length ? "warn" : "ok"}>{disputed.length} open</StatusPill>}
          >
            {disputed.length === 0 ? (
              <p className="small muted">No open disputes.</p>
            ) : (
              <div className="vh-grid" style={{ gap: "var(--sp-2)" }}>
                {disputed.map((o) => (
                  <div key={o.id} className="vh-card" style={{ padding: "var(--sp-3)" }}>
                    <div className="vh-row-between" style={{ gap: 8 }}>
                      <span>
                        <div className="mono" style={{ fontWeight: 600 }}>{o.reference}</div>
                        <div className="small muted">{o.buyer} vs {o.seller} · returned {o.placedAt}</div>
                      </span>
                      <span className="vh-row" style={{ gap: 8 }}>
                        <MoneyText paise={o.totalPaise} />
                        <Link className="vh-btn vh-btn-sm vh-btn-primary" href={`/admin/orders#${o.id}-dispute`}>Adjudicate</Link>
                      </span>
                    </div>
                    <p className="small muted" style={{ margin: "var(--sp-1) 0 0" }}>
                      Buyer already refunded from float — this adjudication decides seller recovery only.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title={<span className="vh-row" style={{ gap: 8 }}><UsersRound {...I} aria-hidden /> Refund rules (A6)</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>
              Refunds under ₹5,000 can post on a single admin&apos;s action (still logged, still reason-coded).
              Refunds at or above ₹5,000 — or whose maker has already made ₹5,000+ of unchecked movements in the
              trailing 24 hours — require a second, different human checker.{" "}
              <code>assertCheckerPresent()</code> rejects a checker who equals the maker, and rejects any service
              account as either party. Splitting one large refund into several small ones does not evade this: the
              cumulative-threshold check counts prior unchecked movements against the same maker.
            </p>
            <StatusPill tone="info">≥ <MoneyText paise={REFUND_CHECKER_THRESHOLD_PAISE} /> → checker required</StatusPill>
          </Card>
        </div>

        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><Truck {...I} aria-hidden /> Courier scorecard</span>}
          action={<span className="small muted">on-time delivery, trailing 30 days</span>}
        >
          <BarList items={COURIER_SCORECARD} color="var(--vh-ok)" />
        </Card>

        <Banner severity="danger" title="Explicitly absent by design">
          <code>POST /admin/orders/:id/refund/reverse</code> does not exist. A refund the platform has issued to a
          buyer cannot be pulled back through this console — reversing money already returned to a buyer is not an
          admin action, it would make the buyer collateral in a seller dispute.
        </Banner>
      </div>
    </Shell>
  );
}
