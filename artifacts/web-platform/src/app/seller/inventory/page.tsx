/**
 * VEDIC HEMP — INVENTORY (§2.4)
 *
 * One table, one authority: the catalogue's on-hand quantity per listing. An
 * order decrements it, a return restocks it, and a listing at zero cannot be
 * added to a cart — the server decides, never this page. Reserved units are
 * derived from this store's own open orders (accepted but not yet delivered),
 * so "available" is what a seller can actually promise.
 *
 * Sellability is the CoA gate (A2), not stock: a batch whose lab report is not
 * APPROVED shows as blocked here even when physical stock exists, and no amount
 * of receiving stock changes that.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Hourglass, PackagePlus, Warehouse as WarehouseIcon } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, DataTable, StatusPill, Stat, MoneyText, type Column } from "@/components/ui";
import { Donut } from "@/components/ui/charts";
import { getSession } from "@/lib/auth-lite";
import { isLowStock, sellerListings, type CatalogProduct } from "@/lib/catalog";
import { ordersForSeller } from "@/lib/orders";
import { actingStore } from "../_lib/store";
import { addStock, saveStock } from "../actions";

export const metadata: Metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

/** Statuses whose units are committed to a buyer but not yet with them. */
const OPEN_STATUSES = ["PLACED", "ACCEPTED", "PACKED", "SHIPPED"];

const SAVED_NOTE: Record<string, { title: string; body: string }> = {
  "1": { title: "Stock updated", body: "The new on-hand quantity is live — it gates add-to-cart and checkout immediately." },
  received: { title: "Stock received", body: "The units were added to on-hand. Sellability is unchanged — a batch still needs an approved lab report to sell." },
};

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ saved?: string; err?: string }> }) {
  const { saved, err } = await searchParams;
  const session = await getSession();
  const store = await actingStore();

  const listings = (await sellerListings(session?.email ?? "", store))
    .filter((p) => p.status === "LIVE" || p.status === "DRAFT" || p.status === "UNDER_REVIEW");

  // Units already sold but not yet delivered — committed, not available.
  const reserved = new Map<string, number>();
  for (const o of await ordersForSeller(store)) {
    if (!OPEN_STATUSES.includes(o.status)) continue;
    for (const it of o.items) {
      if (it.seller !== store) continue;
      reserved.set(it.productId, (reserved.get(it.productId) ?? 0) + it.qty);
    }
  }
  const reservedFor = (p: CatalogProduct) => reserved.get(p.id) ?? 0;

  const lowCount = listings.filter((p) => isLowStock(p)).length;
  const outCount = listings.filter((p) => p.stockQty === 0).length;
  const okCount = listings.length - lowCount - outCount;
  const blocked = listings.filter((p) => p.coaState !== "APPROVED");
  const stockValuePaise = listings.reduce((n, p) => n + p.stockQty * p.pricePaise, 0);
  const totalReserved = [...reserved.values()].reduce((n, q) => n + q, 0);

  // Status palette (reserved for state, never series identity): ok / warn / danger.
  const stockSegments = [
    { value: okCount, color: "var(--vh-ok)", label: "In stock" },
    { value: lowCount, color: "var(--vh-warn)", label: "Low" },
    { value: outCount, color: "var(--vh-danger)", label: "Out" },
  ];

  const columns: Column<CatalogProduct>[] = [
    {
      key: "product", header: "Listing", render: (p) => (
        <span className="vh-row" style={{ gap: 8 }}>
          <span aria-hidden>{p.emoji}</span>
          <span>
            <Link href={`/seller/products/${p.id}`} style={{ fontWeight: 600 }}>{p.title}</Link>
            <div className="small muted">{p.sku ? <span className="mono">{p.sku}</span> : p.cls.replace(/_/g, " ").toLowerCase()}</div>
          </span>
        </span>
      ),
    },
    { key: "batch", header: "Batch", render: (p) => <span className="mono small">{p.batchCode || "—"}</span> },
    { key: "price", header: "Price", align: "right", render: (p) => <MoneyText paise={p.pricePaise} /> },
    {
      key: "onhand", header: "On hand", align: "right", render: (p) => (
        <StatusPill tone={p.stockQty === 0 ? "danger" : isLowStock(p) ? "warn" : "ok"}>
          {p.stockQty === 0 ? "Out of stock" : `${p.stockQty} left${isLowStock(p) ? " · low" : ""}`}
        </StatusPill>
      ),
    },
    { key: "reserved", header: "Committed", align: "right", render: (p) => <span className="tabular">{reservedFor(p) || "—"}</span> },
    {
      key: "sellable", header: "Sellable", render: (p) => (
        <StatusPill tone={p.coaState === "APPROVED" ? "ok" : "danger"}>
          {p.coaState === "APPROVED" ? "Lab report approved" : `Blocked — CoA ${p.coaState.replace(/_/g, " ").toLowerCase()}`}
        </StatusPill>
      ),
    },
    {
      key: "set", header: "Set stock / low-at", align: "right", render: (p) => (
        <form action={saveStock} className="vh-row" style={{ gap: 6, justifyContent: "flex-end" }}>
          <input type="hidden" name="productId" value={p.id} />
          <input className="vh-input" name="stockQty" type="number" min={0} defaultValue={p.stockQty} style={{ width: 90 }} aria-label={`On-hand stock for ${p.title}`} />
          <input className="vh-input" name="lowStockAt" type="number" min={0} defaultValue={p.lowStockAt} style={{ width: 80 }} aria-label={`Low-stock threshold for ${p.title}`} />
          <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Save</button>
        </form>
      ),
    },
  ];

  return (
    <Shell
      active="/seller/inventory"
      breadcrumb={["Seller Central", "Inventory"]}
      title="Inventory"
      actions={<a className="vh-btn vh-btn-sm vh-btn-primary" href="#restock">Receive stock</a>}
    >
      {saved && SAVED_NOTE[saved] && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title={SAVED_NOTE[saved]!.title}>{SAVED_NOTE[saved]!.body}</Banner>
        </div>
      )}
      {err === "qty" && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger" title="Nothing was received">Enter a listing and a quantity between 1 and 10,000.</Banner>
        </div>
      )}

      <div className="vh-grid cols-2" style={{ alignItems: "start", marginBottom: "var(--sp-4)" }}>
        <Card title="Stock health">
          <div className="vh-row" style={{ gap: 24, alignItems: "center" }}>
            <Donut segments={stockSegments} size={128} centre={`${listings.length}`} />
            <div className="vh-grid" style={{ gap: 8, flex: 1 }}>
              {stockSegments.map((s) => (
                <div key={s.label} className="vh-row-between small">
                  <span className="vh-row" style={{ gap: 8 }}>
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: s.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{s.label}</span>
                  </span>
                  <span className="muted tabular">{s.value} listing{s.value === 1 ? "" : "s"}</span>
                </div>
              ))}
            </div>
          </div>
          {listings.length === 0 && (
            <p className="small muted" style={{ margin: "12px 0 0" }}>
              No listings yet. <Link href="/seller/products/new">Add your first product</Link> — stock is tracked per
              listing from the moment it exists.
            </p>
          )}
        </Card>

        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <div className="vh-grid cols-3">
            <Card><Stat label="Stock at list price" value={<MoneyText paise={stockValuePaise} />} /></Card>
            <Card><Stat label="Committed to buyers" value={totalReserved} /></Card>
            <Card>
              <Stat label="Blocked on a lab report" value={blocked.length} delta={blocked.length > 0 ? { dir: "down", text: "can't sell" } : undefined} />
            </Card>
          </div>

          <div className="vh-row" role="note" style={{ alignItems: "flex-start", gap: 10, border: "1px solid var(--vh-line)", borderLeft: "3px solid var(--vh-info)", borderRadius: "var(--vh-radius-sm)", padding: "12px 14px", background: "color-mix(in srgb, var(--vh-info-bg) 45%, var(--vh-surface))" }}>
            <Hourglass size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-info)", marginTop: 2, flexShrink: 0 }} />
            <div className="small">
              <strong>Committed units are already sold.</strong> They sit in orders you have accepted but not yet
              delivered, so treat on-hand minus committed as what you can still promise. A cancelled or returned
              order puts its units back.
            </div>
          </div>
        </div>
      </div>

      <Card
        title={<span className="vh-row" style={{ gap: 8 }}><WarehouseIcon size={16} strokeWidth={2.2} aria-hidden /> Stock by listing</span>}
        action={<StatusPill tone={outCount ? "danger" : lowCount ? "warn" : "ok"}>{outCount} out · {lowCount} low</StatusPill>}
        pad0
      >
        <DataTable columns={columns} rows={listings} empty={<div className="vh-empty">No listings yet.</div>} />
      </Card>
      <p className="small muted" style={{ marginTop: 8 }}>
        On-hand is the server&rsquo;s authority on stock: an order decrements it, a return or cancellation restocks it,
        and a listing at zero cannot be added to a cart or bought — no overselling. &ldquo;Low-at&rdquo; sets the
        amber threshold on this page and on your dashboard.
      </p>

      {/* Receive stock */}
      <div id="restock" style={{ scrollMarginTop: 90, marginTop: "var(--sp-4)" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><PackagePlus size={16} strokeWidth={2.2} aria-hidden /> Receive stock</span>}>
          <form action={addStock} className="vh-row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="vh-field" style={{ minWidth: 260 }}>
              <label className="vh-label" htmlFor="stock-listing">Listing <span className="req">*</span></label>
              <select className="vh-select" id="stock-listing" name="productId" required defaultValue="">
                <option value="" disabled>Choose a listing…</option>
                {listings.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}{p.batchCode ? ` — batch ${p.batchCode}` : ""} ({p.stockQty} on hand)</option>
                ))}
              </select>
            </div>
            <div className="vh-field" style={{ width: 140 }}>
              <label className="vh-label" htmlFor="stock-qty">Units received <span className="req">*</span></label>
              <input className="vh-input" id="stock-qty" name="qty" type="number" min={1} max={10000} required placeholder="100" />
            </div>
            <button type="submit" className="vh-btn vh-btn-primary" disabled={listings.length === 0}>Add to on hand</button>
            <span className="vh-help" style={{ flexBasis: "100%" }}>
              Adds to the current quantity rather than replacing it — use the table above to correct an absolute
              figure. Receiving stock never changes sellability: a listing blocked on its lab report stays blocked
              until the report is approved. A new batch is recorded on the product page, with its own CoA.
            </span>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
