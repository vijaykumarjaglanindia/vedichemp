/**
 * VEDIC HEMP — TAX INVOICE (print view)
 *
 * Server-rendered, print-ready invoice for one order — works for the sample
 * history and for orders placed this session (live-<ref>). Every amount is
 * integer paise via MoneyText; the seller of record issues the invoice (the
 * platform is a marketplace intermediary collecting payment on their behalf).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { MoneyText } from "@/components/ui";
import { ORDERS, PRODUCTS } from "@/lib/sample";
import { readOrderHistory } from "@/lib/engage";

export const metadata: Metadata = { title: "Tax invoice" };

const printCss = `
@media print {
  .vh-inv-toolbar { display: none !important; }
  body { background: #fff !important; }
}
`;

interface InvoiceModel {
  reference: string;
  placedAt: string;
  seller: string;
  buyerName: string;
  buyerCity: string;
  items: { title: string; qty: number; unitPaise: number | null; linePaise: number | null }[];
  subtotalPaise: number;
  discountPaise: number;
  couponCode: string | null;
  shippingPaise: number;
  totalPaise: number;
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let model: InvoiceModel | null = null;
  if (id.startsWith("live-")) {
    const stored = (await readOrderHistory()).find((o) => `live-${o.reference}` === id);
    if (stored) {
      const items = stored.items.map((it) => {
        const product = PRODUCTS.find((p) => p.title === it.title);
        const unitPaise = product?.pricePaise ?? null;
        return { title: it.title, qty: it.qty, unitPaise, linePaise: unitPaise !== null ? unitPaise * it.qty : null };
      });
      model = {
        reference: stored.reference,
        placedAt: stored.placedAt.slice(0, 10),
        seller: stored.items[0]?.seller ?? "Marketplace seller",
        buyerName: "As on the order",
        buyerCity: `${stored.city} ${stored.pincode}`,
        items,
        subtotalPaise: stored.subtotalPaise,
        discountPaise: 0,
        couponCode: null,
        shippingPaise: stored.shippingPaise,
        totalPaise: stored.totalPaise,
      };
    }
  } else {
    const order = ORDERS.find((o) => o.id === id);
    if (order) {
      const taxPaise = Math.round(order.totalPaise * 0.05);
      model = {
        reference: order.reference,
        placedAt: order.placedAt,
        seller: order.seller ?? "Marketplace seller",
        buyerName: order.buyer ?? "Registered buyer",
        buyerCity: "As on the order",
        items: order.items.map((it) => ({ title: it.title, qty: it.qty, unitPaise: null, linePaise: null })),
        subtotalPaise: order.totalPaise - taxPaise,
        discountPaise: 0,
        couponCode: null,
        shippingPaise: taxPaise,
        totalPaise: order.totalPaise,
      };
    }
  }
  if (!model) notFound();

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-4)", paddingBottom: "var(--sp-6)", maxWidth: 720 }}>
      <style dangerouslySetInnerHTML={{ __html: printCss }} />

      <div className="vh-inv-toolbar vh-row-between" style={{ marginBottom: "var(--sp-3)", flexWrap: "wrap", gap: 10 }}>
        <Link href={`/account/orders/${id}`} className="vh-btn vh-btn-sm vh-btn-ghost">
          <ArrowLeft size={14} aria-hidden /> Back to order
        </Link>
        <span className="vh-btn vh-btn-sm vh-btn-primary" aria-hidden style={{ gap: 6 }}>
          <Printer size={14} aria-hidden /> Print / Save as PDF: Ctrl/Cmd+P
        </span>
      </div>

      <div className="vh-card" style={{ padding: "var(--sp-5)" }}>
        <div className="vh-row-between" style={{ alignItems: "flex-start", marginBottom: "var(--sp-4)" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.2rem" }}>Tax Invoice</div>
            <div className="small muted">Issued by the seller of record · facilitated by Vedic Hemp (marketplace)</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mono" style={{ fontWeight: 800 }}>{model.reference}</div>
            <div className="small muted tabular">{model.placedAt}</div>
          </div>
        </div>

        <div className="vh-grid cols-2" style={{ marginBottom: "var(--sp-4)" }}>
          <div>
            <div className="small muted" style={{ textTransform: "uppercase", letterSpacing: ".06em", fontSize: ".68rem", marginBottom: 4 }}>Sold by</div>
            <div style={{ fontWeight: 700 }}>{model.seller}</div>
            <div className="small muted">Licence details on the seller&rsquo;s storefront</div>
          </div>
          <div>
            <div className="small muted" style={{ textTransform: "uppercase", letterSpacing: ".06em", fontSize: ".68rem", marginBottom: 4 }}>Billed to</div>
            <div style={{ fontWeight: 700 }}>{model.buyerName}</div>
            <div className="small muted">{model.buyerCity}</div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="vh-table">
            <thead>
              <tr><th>Item</th><th style={{ textAlign: "right" }}>Qty</th><th style={{ textAlign: "right" }}>Unit</th><th style={{ textAlign: "right" }}>Amount</th></tr>
            </thead>
            <tbody>
              {model.items.map((it, i) => (
                <tr key={i}>
                  <td>{it.title}</td>
                  <td className="tabular" style={{ textAlign: "right" }}>{it.qty}</td>
                  <td className="tabular" style={{ textAlign: "right" }}>{it.unitPaise !== null ? <MoneyText paise={it.unitPaise} /> : "—"}</td>
                  <td className="tabular" style={{ textAlign: "right" }}>{it.linePaise !== null ? <MoneyText paise={it.linePaise} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginLeft: "auto", maxWidth: 280, marginTop: "var(--sp-3)", display: "grid", gap: 6 }}>
          <div className="vh-row-between small"><span className="muted">Subtotal</span><MoneyText paise={model.subtotalPaise} /></div>
          {model.discountPaise > 0 && (
            <div className="vh-row-between small" style={{ color: "var(--vh-ok)" }}>
              <span>Coupon {model.couponCode}</span><span>− <MoneyText paise={model.discountPaise} /></span>
            </div>
          )}
          <div className="vh-row-between small">
            <span className="muted">{id.startsWith("live-") ? "Shipping" : "Tax (GST)"}</span>
            <MoneyText paise={model.shippingPaise} />
          </div>
          <hr className="vh-divider" />
          <div className="vh-row-between" style={{ fontWeight: 800 }}>
            <span>Total</span><MoneyText paise={model.totalPaise} />
          </div>
        </div>

        <p className="small muted" style={{ margin: "var(--sp-4) 0 0" }}>
          All amounts include applicable GST and are computed server-side in integer paise.
          Vedic Hemp collects payment on the seller&rsquo;s behalf; the product is sold and shipped by
          the seller named above. Support: support@vedichemp.com
        </p>
      </div>
    </div>
  );
}
