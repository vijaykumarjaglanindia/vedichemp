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
import { Scale, Truck, UsersRound, PackageCheck } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, MoneyText, Banner, DataTable, Stat } from "@/components/ui";
import { BarList } from "@/components/ui/charts";
import { allOrders, metricsFor, ORDER_TONE } from "@/lib/orders";
import { adminApproveReturn, adminMarkRecovered, adminRefundBuyer, adminRejectReturn } from "../actions";
import { COURIER_SCORECARD } from "../_lib/data";

export const metadata: Metadata = { title: "Orders · Admin" };
export const dynamic = "force-dynamic";

const ORDER_MSG: Record<string, { severity: "ok" | "danger" | "warn"; title: string; body: string }> = {
  refunded: { severity: "ok", title: "Buyer refunded", body: "Their money moved immediately; a seller-recovery ledger entry opened as PENDING — pursued afterwards, never blocking the buyer." },
  approved: { severity: "ok", title: "Return approved", body: "Awaiting the refund step. The buyer is still refunded first when it's issued." },
  rejected: { severity: "ok", title: "Return rejected", body: "The buyer sees your reason on the order." },
  recovered: { severity: "ok", title: "Seller recovery settled", body: "The internal ledger is closed — this never affected the buyer's refund." },
  err: { severity: "danger", title: "That action isn't available", body: "The order isn't in a state where that applies, or the note was too short." },
};

/** Reason-specific error copy (overrides the generic `err` banner). */
const ERR_MSG: Record<string, { severity: "ok" | "danger" | "warn"; title: string; body: string }> = {
  maker_checker: { severity: "danger", title: "Blocked — maker cannot be checker", body: "You initiated this return, so you cannot also issue its refund. A different admin must refund. The denied attempt has been logged." },
  role: { severity: "danger", title: "Blocked — issuing a refund needs ADMIN_FINANCE", body: "Refunds move money, so only an admin holding the finance role may issue one — the owner, who appoints finance, cannot. Ask an owner to grant the role on Settings → Roles. The attempt was logged." },
};

const I = { size: 16, strokeWidth: 2.2 } as const;
const IB = { size: 14, strokeWidth: 2.2 } as const;

const REFUND_CHECKER_THRESHOLD_PAISE = 500_000; // ₹5,000 — mirrors assertCheckerPresent()

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const flag = Object.keys(ORDER_MSG).find((k) => sp[k] !== undefined);
  const msg = (sp.err && ERR_MSG[sp.err]) || (flag ? ORDER_MSG[flag] : undefined);

  // Real orders from the order store.
  const real = await allOrders();
  const m = metricsFor(real);
  const openReturns = real.filter((o) => ["RETURN_REQUESTED", "RETURN_APPROVED"].includes(o.status));
  const pendingRecovery = real.filter((o) => o.sellerRecovery === "PENDING");

  return (
    <Shell active="/admin/orders" breadcrumb={["Admin", "Orders"]} title="Orders, returns & refunds">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        {msg && <Banner severity={msg.severity} title={msg.title}>{msg.body}</Banner>}
        <Banner severity="info" title="Buyer-first refunds">
          When an order is disputed, the buyer is refunded first from the platform&apos;s settlement float; recovery
          from the seller (via the next settlement run) happens afterwards. A buyer never waits on a seller dispute
          to be resolved to get their money back.
        </Banner>

        {/* Live operations metrics */}
        <div className="vh-grid cols-4">
          <Card><Stat label="Orders" value={m.orders} /></Card>
          <Card><Stat label="Net revenue" value={`₹${Math.round(m.netPaise / 100).toLocaleString("en-IN")}`} /></Card>
          <Card><Stat label="Awaiting fulfilment" value={m.pendingFulfilment} /></Card>
          <Card><Stat label="Open returns" value={m.openReturns} delta={m.openReturns > 0 ? { dir: "down", text: "adjudicate" } : undefined} /></Card>
        </div>

        {/* Real orders */}
        {real.length > 0 && (
          <Card title={<span className="vh-row" style={{ gap: 8 }}><PackageCheck {...I} aria-hidden /> Live orders</span>} pad0>
            <DataTable
              columns={[
                { key: "ref", header: "Order", render: (o: (typeof real)[number]) => <div><div className="mono" style={{ fontWeight: 600 }}>{o.reference}</div><div className="small muted">{o.placedAt.slice(0, 10)} · {o.buyerEmail}</div></div> },
                { key: "items", header: "Items", render: (o: (typeof real)[number]) => <span className="small">{o.items.map((it) => `${it.emoji} ${it.title}×${it.qty}`).join(", ")}</span> },
                { key: "status", header: "Status", render: (o: (typeof real)[number]) => <StatusPill tone={ORDER_TONE[o.status]}>{o.status.replace(/_/g, " ")}</StatusPill> },
                { key: "total", header: "Total", align: "right", render: (o: (typeof real)[number]) => <MoneyText paise={o.totalPaise} /> },
                { key: "rec", header: "Seller recovery", render: (o: (typeof real)[number]) => o.sellerRecovery === "NONE" ? <span className="small muted">—</span> : <StatusPill tone={o.sellerRecovery === "RECOVERED" ? "ok" : "warn"}>{o.sellerRecovery}</StatusPill> },
              ]}
              rows={real}
            />
          </Card>
        )}

        {/* Returns queue — buyer-first refund adjudication */}
        <div id="returns" style={{ scrollMarginTop: 90 }}>
          <Card
            title={<span className="vh-row" style={{ gap: 8 }}><Scale {...I} aria-hidden /> Returns queue — buyer-first refunds</span>}
            action={<StatusPill tone={openReturns.length ? "warn" : "ok"}>{openReturns.length} open</StatusPill>}
          >
            {openReturns.length === 0 ? (
              <p className="small muted" style={{ margin: 0 }}>No open returns.</p>
            ) : (
              <div className="vh-grid cols-2">
                {openReturns.map((o) => (
                  <div key={o.reference} id={`ret-${o.reference}`} className="vh-card" style={{ padding: "var(--sp-3)", display: "grid", gap: "var(--sp-2)" }}>
                    <div className="vh-row-between" style={{ gap: 8 }}>
                      <span className="mono" style={{ fontWeight: 600 }}>{o.reference}</span>
                      <MoneyText paise={o.totalPaise} />
                    </div>
                    <div className="small muted">{o.buyerEmail} · {o.items[0]?.seller} · {o.status.replace(/_/g, " ")}</div>
                    {o.returnReason && <div className="small">Reason: {o.returnReason}</div>}
                    <form action={adminRefundBuyer} style={{ display: "inline-flex" }}>
                      <input type="hidden" name="reference" value={o.reference} />
                      <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Refund buyer now (buyer-first)</button>
                    </form>
                    {o.status === "RETURN_REQUESTED" && (
                      <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <form action={adminApproveReturn} style={{ display: "inline-flex" }}>
                          <input type="hidden" name="reference" value={o.reference} />
                          <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Approve (refund later)</button>
                        </form>
                        <details style={{ position: "relative" }}>
                          <summary className="vh-btn vh-btn-sm vh-btn-ghost" style={{ listStyle: "none", cursor: "pointer" }}>Reject…</summary>
                          <form action={adminRejectReturn} className="vh-card" style={{ position: "absolute", left: 0, zIndex: 5, padding: 12, width: 280, display: "grid", gap: 8 }}>
                            <input type="hidden" name="reference" value={o.reference} />
                            <textarea className="vh-textarea" name="note" rows={2} maxLength={300} placeholder="Reason the buyer will see (≥ 20 chars)" />
                            <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Reject return</button>
                          </form>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Seller-recovery ledger — settled after the fact, never blocks buyer */}
        {pendingRecovery.length > 0 && (
          <div id="recovery" style={{ scrollMarginTop: 90 }}>
            <Card title={<span className="vh-row" style={{ gap: 8 }}><UsersRound {...I} aria-hidden /> Seller-recovery ledger</span>} action={<StatusPill tone="warn">{pendingRecovery.length} pending</StatusPill>}>
              <p className="small muted" style={{ marginTop: 0 }}>
                These buyers were already refunded. Recovery from the seller is a separate step — settling it here never
                touches money the buyer has received.
              </p>
              <div className="vh-grid" style={{ gap: "var(--sp-2)" }}>
                {pendingRecovery.map((o) => (
                  <div key={o.reference} id={`rec-${o.reference}`} className="vh-row-between" style={{ gap: 8, padding: "8px 0", borderTop: "1px solid var(--vh-line)" }}>
                    <span className="small"><span className="mono" style={{ fontWeight: 600 }}>{o.reference}</span> · recover <MoneyText paise={o.refundedPaise} /> from {o.items[0]?.seller}</span>
                    <form action={adminMarkRecovered} style={{ display: "inline-flex" }}>
                      <input type="hidden" name="reference" value={o.reference} />
                      <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Mark recovered</button>
                    </form>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        <Card title={<span className="vh-row" style={{ gap: 8 }}><UsersRound {...I} aria-hidden /> Refund rules</span>}>
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
