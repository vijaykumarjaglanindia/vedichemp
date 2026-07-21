/**
 * VEDIC HEMP — INVENTORY (§2.4)
 *
 * Stock by warehouse/batch, reserved units, low-stock alerts and FEFO
 * (first-expiry-first-out) guidance. A batch without an APPROVED CoA shows
 * as unsellable here even if physical stock exists (A2).
 */

import type { Metadata } from "next";
import { Hourglass, RotateCcw, Warehouse as WarehouseIcon } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, DataTable, StatusPill, Stat, MoneyText, type Column } from "@/components/ui";
import { Donut } from "@/components/ui/charts";
import { getSession } from "@/lib/auth-lite";
import { isLowStock, sellerListings, type CatalogProduct } from "@/lib/catalog";
import { readStockAdds } from "@/lib/engage";
import { sellerData, LOW_STOCK_THRESHOLD, type WarehouseStock } from "../_lib/data";
import { actingStore } from "../_lib/store";
import { addStock, saveStock } from "../actions";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const session = await getSession();
  const store = await actingStore();
  const { WAREHOUSE_STOCK } = sellerData(store);
  // The stock that actually gates purchases: the live catalog store's on-hand
  // quantity per listing. An order decrements it; zero blocks add-to-cart.
  const listings = (await sellerListings(session?.email ?? "seller@example.in", store))
    .filter((p) => p.status === "LIVE" || p.status === "DRAFT" || p.status === "UNDER_REVIEW");
  const lowCount = listings.filter((p) => isLowStock(p)).length;
  const outCount = listings.filter((p) => p.stockQty === 0).length;

  const listingCols: Column<CatalogProduct>[] = [
    { key: "product", header: "Listing", render: (p) => <span className="vh-row" style={{ gap: 8 }}><span aria-hidden>{p.emoji}</span><span style={{ fontWeight: 600 }}>{p.title}</span></span> },
    { key: "price", header: "Price", align: "right", render: (p) => <MoneyText paise={p.pricePaise} /> },
    { key: "onhand", header: "On hand", align: "right", render: (p) => (
        <StatusPill tone={p.stockQty === 0 ? "danger" : isLowStock(p) ? "warn" : "ok"}>
          {p.stockQty === 0 ? "Out of stock" : `${p.stockQty} left${isLowStock(p) ? " · low" : ""}`}
        </StatusPill>
      ) },
    { key: "set", header: "Set stock / low-at", align: "right", render: (p) => (
        <form action={saveStock} className="vh-row" style={{ gap: 6, justifyContent: "flex-end" }}>
          <input type="hidden" name="productId" value={p.id} />
          <input className="vh-input" name="stockQty" type="number" min={0} defaultValue={p.stockQty} style={{ width: 90 }} aria-label={`On-hand stock for ${p.title}`} />
          <input className="vh-input" name="lowStockAt" type="number" min={0} defaultValue={p.lowStockAt} style={{ width: 80 }} aria-label={`Low-stock threshold for ${p.title}`} />
          <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Save</button>
        </form>
      ) },
  ];
  const isLow = (w: WarehouseStock) => w.qty - w.reserved < LOW_STOCK_THRESHOLD && w.qty - w.reserved > 0;
  const isOut = (w: WarehouseStock) => w.qty - w.reserved <= 0;

  // Units added via "Add stock"/"Reorder" this session (server-written cookie;
  // a stock-movement row with the DB attached). Sellability is untouched —
  // adding stock never bypasses the CoA gate (A2).
  const adds = await readStockAdds();
  const stock = WAREHOUSE_STOCK.map((w) => ({ ...w, qty: w.qty + (adds[w.batch] ?? 0) }));

  const inStock = stock.filter((w) => !isLow(w) && !isOut(w)).length;
  const low = stock.filter(isLow).length;
  const out = stock.filter(isOut).length;
  const warehouses = Array.from(new Set(stock.map((w) => w.warehouse)));

  // Status palette (reserved for state, never series identity): ok / warn / danger.
  const stockSegments = [
    { value: inStock, color: "var(--vh-ok)", label: "In stock" },
    { value: low, color: "var(--vh-warn)", label: "Low" },
    { value: out, color: "var(--vh-danger)", label: "Out" },
  ];

  const columns: Column<WarehouseStock>[] = [
    { key: "product", header: "Product", render: (w) => <span style={{ fontWeight: 600 }}>{w.product}</span> },
    { key: "batch", header: "Batch", render: (w) => <span className="mono">{w.batch}</span> },
    { key: "warehouse", header: "Warehouse", render: (w) => w.warehouse },
    { key: "qty", header: "On hand", align: "right", render: (w) => <span className="tabular">{w.qty}</span> },
    { key: "reserved", header: "Reserved", align: "right", render: (w) => <span className="tabular">{w.reserved}</span> },
    { key: "available", header: "Available", align: "right", render: (w) => <span className="tabular" style={{ fontWeight: 700 }}>{w.qty - w.reserved}</span> },
    {
      key: "sellable", header: "Sellable", render: (w) => (
        <StatusPill tone={w.sellable ? "ok" : "danger"}>{w.sellable ? "Sellable (CoA approved)" : "Blocked — CoA not approved"}</StatusPill>
      ),
    },
    {
      key: "actions", header: "", align: "right", render: (w) =>
        isLow(w) || isOut(w) ? (
          <form action={addStock} style={{ display: "inline-flex" }}>
            <input type="hidden" name="batch" value={w.batch} />
            <input type="hidden" name="qty" value={100} />
            <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit" title={`Add 100 units to batch ${w.batch}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <RotateCcw size={13} strokeWidth={2.2} aria-hidden /> Reorder 100
            </button>
          </form>
        ) : null,
    },
  ];

  return (
    <Shell
      active="/seller/inventory"
      breadcrumb={["Seller Central", "Inventory"]}
      title="Inventory"
      actions={<a className="vh-btn vh-btn-sm vh-btn-primary" href="#restock">Add stock</a>}
    >
      {saved && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title="Stock updated">The new on-hand quantity is live — it gates add-to-cart and checkout immediately.</Banner></div>}

      {/* Live listing stock — the quantity that actually gates purchases */}
      <div style={{ marginBottom: "var(--sp-4)" }}>
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><WarehouseIcon size={16} strokeWidth={2.2} aria-hidden /> Live listing stock</span>}
          action={<StatusPill tone={outCount ? "danger" : lowCount ? "warn" : "ok"}>{outCount} out · {lowCount} low</StatusPill>}
          pad0
        >
          <DataTable columns={listingCols} rows={listings} empty={<div className="vh-empty">No listings yet.</div>} />
        </Card>
        <p className="small muted" style={{ marginTop: 8 }}>
          On-hand is the server&rsquo;s authority on stock: an order decrements it, a return/cancel restocks it, and a
          listing at zero cannot be added to a cart or bought — no overselling. &ldquo;Low-at&rdquo; sets the amber threshold.
        </p>
      </div>

      <div className="vh-grid cols-2" style={{ alignItems: "start", marginBottom: "var(--sp-4)" }}>
        <Card title="Stock health">
          <div className="vh-row" style={{ gap: 24, alignItems: "center" }}>
            <Donut segments={stockSegments} size={128} centre={`${stock.length}`} />
            <div className="vh-grid" style={{ gap: 8, flex: 1 }}>
              {stockSegments.map((s) => (
                <div key={s.label} className="vh-row-between small">
                  <span className="vh-row" style={{ gap: 8 }}>
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: s.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{s.label}</span>
                  </span>
                  <span className="muted tabular">{s.value} batch line{s.value === 1 ? "" : "s"}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <div className="vh-grid cols-3">
            <Card>
              <Stat label="Warehouses" value={warehouses.length} />
              <div className="small muted vh-row" style={{ gap: 6, marginTop: 6 }}>
                <WarehouseIcon size={13} strokeWidth={2.2} aria-hidden /> {warehouses.join(", ")}
              </div>
            </Card>
            <Card><Stat label="Batch lines" value={stock.length} /></Card>
            <Card><Stat label="Low / out" value={low + out} delta={low + out > 0 ? { dir: "down", text: "needs reorder" } : undefined} /></Card>
          </div>

          <div className="vh-row" role="note" style={{ alignItems: "flex-start", gap: 10, border: "1px solid var(--vh-line)", borderLeft: "3px solid var(--vh-info)", borderRadius: "var(--vh-radius-sm)", padding: "12px 14px", background: "color-mix(in srgb, var(--vh-info-bg) 45%, var(--vh-surface))" }}>
            <Hourglass size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-info)", marginTop: 2, flexShrink: 0 }} />
            <div className="small">
              <strong>FEFO — First-Expiry, First-Out.</strong> Outbound picking always allocates the batch with the
              nearest expiry date first, provided it is sellable (CoA approved, A2). A newer batch cannot ship ahead
              of an older approved one.
            </div>
          </div>
        </div>
      </div>

      <Card pad0>
        <DataTable columns={columns} rows={stock} empty={<div className="vh-empty">No stock recorded yet.</div>} />
      </Card>

      {/* Add stock */}
      <div id="restock" style={{ scrollMarginTop: 90, marginTop: "var(--sp-4)" }}>
        <Card title="Add stock">
          <form action={addStock} className="vh-row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="vh-field" style={{ minWidth: 220 }}>
              <label className="vh-label" htmlFor="stock-batch">Batch <span className="req">*</span></label>
              <select className="vh-select" id="stock-batch" name="batch" required defaultValue="">
                <option value="" disabled>Choose a batch…</option>
                {stock.map((w) => (
                  <option key={w.batch} value={w.batch}>{w.batch} — {w.product}</option>
                ))}
              </select>
            </div>
            <div className="vh-field" style={{ width: 140 }}>
              <label className="vh-label" htmlFor="stock-qty">Units <span className="req">*</span></label>
              <input className="vh-input" id="stock-qty" name="qty" type="number" min={1} max={10000} required placeholder="100" />
            </div>
            <button type="submit" className="vh-btn vh-btn-primary">Add units</button>
            <span className="vh-help" style={{ flexBasis: "100%" }}>
              Adding stock never changes sellability — a batch blocked on its CoA stays blocked until the
              report is approved. A brand-new batch is added from the product page with its own CoA.
            </span>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
