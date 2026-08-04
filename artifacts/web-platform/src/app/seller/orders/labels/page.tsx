/**
 * VEDIC HEMP — BULK SHIPPING LABELS (print view)
 *
 * Server-rendered, print-ready labels for every real order that is ACCEPTED or
 * PACKED — nothing to print for a new, already-shipped or unpaid order. This is
 * the point at which the buyer's delivery address becomes visible to the seller,
 * which is exactly why labels exist only for orders the seller has accepted: the
 * address is released for the one purpose that needs it.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { ordersForSeller } from "@/lib/orders";
import { actingStore } from "../../_lib/store";

export const metadata: Metadata = { title: "Shipping labels" };
export const dynamic = "force-dynamic";

const printCss = `
@media print {
  .vh-labels-toolbar { display: none !important; }
  body { background: #fff !important; }
  .vh-label-card { break-inside: avoid; }
}
`;

export default async function ShippingLabelsPage() {
  const store = await actingStore();
  const printable = (await ordersForSeller(store)).filter((o) => o.status === "ACCEPTED" || o.status === "PACKED");

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-4)", paddingBottom: "var(--sp-6)", maxWidth: 900 }}>
      <style dangerouslySetInnerHTML={{ __html: printCss }} />

      <div className="vh-labels-toolbar vh-row-between" style={{ marginBottom: "var(--sp-4)", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ marginBottom: 4, fontSize: "1.3rem" }}>Shipping labels</h1>
          <p className="small muted" style={{ margin: 0 }}>
            {printable.length} label{printable.length === 1 ? "" : "s"} ready — accepted &amp; packed orders only.
            Use your browser&rsquo;s print dialog (Ctrl/Cmd+P).
          </p>
          <p className="small muted" style={{ margin: "4px 0 0" }}>
            Each label carries the buyer&rsquo;s real delivery address, released to you at label time and for this
            purpose only.
          </p>
        </div>
        <span className="vh-row" style={{ gap: 8 }}>
          <Link href="/seller/orders" className="vh-btn vh-btn-sm vh-btn-ghost">
            <ArrowLeft size={14} aria-hidden /> Back to orders
          </Link>
          <span className="vh-btn vh-btn-sm vh-btn-primary" aria-hidden style={{ gap: 6 }}>
            <Printer size={14} aria-hidden /> Print: Ctrl/Cmd+P
          </span>
        </span>
      </div>

      {printable.length === 0 ? (
        <div className="vh-card" style={{ textAlign: "center", padding: "var(--sp-5)" }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>Nothing to print yet</p>
          <p className="small muted" style={{ margin: 0 }}>
            Accept an order first — labels are generated only for accepted and packed orders,
            because that&rsquo;s when the buyer&rsquo;s address is released to you.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "var(--sp-3)" }}>
          {printable.map((o) => {
            const myItems = o.items.filter((it) => it.seller === store);
            return (
              <div key={o.reference} className="vh-card vh-label-card" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "var(--sp-3)" }}>
                <div>
                  <div className="small muted" style={{ textTransform: "uppercase", letterSpacing: ".06em", fontSize: ".68rem", marginBottom: 6 }}>Deliver to</div>
                  <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{o.shipName ?? "Buyer"}</div>
                  {o.shipLine1 && <div className="small">{o.shipLine1}</div>}
                  <div className="small">
                    {o.city}{o.state ? `, ${o.state}` : ""} — <span className="mono">{o.pincode}</span>
                  </div>
                  {o.shipMobile && <div className="small mono">{o.shipMobile}</div>}
                  <div className="small muted" style={{ marginTop: 10 }}>
                    {myItems.map((it) => `${it.title}${it.variantLabel ? ` · ${it.variantLabel}` : ""} × ${it.qty}`).join(" · ")}
                  </div>
                </div>
                <div style={{ textAlign: "right", display: "grid", alignContent: "space-between" }}>
                  <div>
                    <div className="mono" style={{ fontWeight: 800 }}>{o.reference}</div>
                    <div className="small muted">{o.status === "PACKED" ? "Packed — ready for handover" : "Accepted — pack next"}</div>
                  </div>
                  <div className="small muted">{o.placedAt.slice(0, 10)}</div>
                </div>
              </div>
            );
          })}
          <p className="small muted vh-labels-toolbar" style={{ margin: 0 }}>
            Hand the parcel to your delivery partner, then mark the order shipped — status flips to
            SHIPPED only after handover, never before.
          </p>
        </div>
      )}
    </div>
  );
}
