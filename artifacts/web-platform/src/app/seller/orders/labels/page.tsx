/**
 * VEDIC HEMP — BULK SHIPPING LABELS (print view)
 *
 * Server-rendered, print-ready labels for every order that is ACCEPTED or
 * PACKED (nothing to print for pending or already-shipped orders). This is
 * the point where the buyer's address becomes visible to the seller — which
 * is why labels exist only for orders the seller has accepted.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { readSellerOrderOverrides } from "@/lib/engage";
import { SELLER_ORDERS } from "../../_lib/data";

export const metadata: Metadata = { title: "Shipping labels" };

/** Deterministic demo address per buyer — replaced by the order's shipping
 *  address once the DB is attached. */
function demoAddress(buyer: string, reference: string): { line: string; city: string; pin: string } {
  const n = buyer.length + reference.length;
  const cities = ["Pune 411001", "Bengaluru 560034", "Mumbai 400050", "Jaipur 302001", "Kochi 682016"];
  const city = cities[n % cities.length] ?? cities[0]!;
  return {
    line: `${(n % 90) + 10}, ${["Rose Villa", "Green Court", "Lotus Residency", "Cedar Heights"][n % 4]}`,
    city: city.split(" ")[0]!,
    pin: city.split(" ")[1]!,
  };
}

const printCss = `
@media print {
  .vh-labels-toolbar { display: none !important; }
  body { background: #fff !important; }
  .vh-label-card { break-inside: avoid; }
}
`;

export default async function ShippingLabelsPage() {
  const overrides = await readSellerOrderOverrides();
  const printable = SELLER_ORDERS
    .map((o) => ({ ...o, status: overrides[o.id] ?? o.status }))
    .filter((o) => o.status === "ACCEPTED" || o.status === "PACKED");

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
            const addr = demoAddress(o.buyer ?? "Buyer", o.reference);
            return (
              <div key={o.id} className="vh-card vh-label-card" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "var(--sp-3)" }}>
                <div>
                  <div className="small muted" style={{ textTransform: "uppercase", letterSpacing: ".06em", fontSize: ".68rem", marginBottom: 6 }}>Deliver to</div>
                  <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{o.buyer}</div>
                  <div className="small">{addr.line}</div>
                  <div className="small">{addr.city} — <span className="mono">{addr.pin}</span></div>
                  <div className="small muted" style={{ marginTop: 10 }}>
                    {o.items.map((it) => `${it.title} × ${it.qty}`).join(" · ")}
                  </div>
                </div>
                <div style={{ textAlign: "right", display: "grid", alignContent: "space-between" }}>
                  <div>
                    <div className="mono" style={{ fontWeight: 800 }}>{o.reference}</div>
                    <div className="small muted">{o.status === "PACKED" ? "Packed — ready for handover" : "Accepted — pack next"}</div>
                  </div>
                  <div aria-hidden className="mono" style={{ fontSize: "1.5rem", letterSpacing: 2, fontWeight: 800 }}>
                    ▮▯▮▮▯▮▯▮
                  </div>
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
