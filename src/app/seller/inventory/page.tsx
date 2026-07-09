/**
 * VEDIC HEMP — INVENTORY (§2.4)
 *
 * Stock by warehouse/batch, reserved units, low-stock alerts and FEFO
 * (first-expiry-first-out) guidance. A batch without an APPROVED CoA shows
 * as unsellable here even if physical stock exists (A2).
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, DataTable, StatusPill, Banner, type Column } from "@/components/ui";
import { WAREHOUSE_STOCK, LOW_STOCK_THRESHOLD, type WarehouseStock } from "../_lib/data";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage() {
  const columns: Column<WarehouseStock>[] = [
    { key: "product", header: "Product", render: (w) => w.product },
    { key: "batch", header: "Batch", render: (w) => <span className="mono">{w.batch}</span> },
    { key: "warehouse", header: "Warehouse", render: (w) => w.warehouse },
    { key: "qty", header: "On hand", align: "right", render: (w) => w.qty },
    { key: "reserved", header: "Reserved", align: "right", render: (w) => w.reserved },
    { key: "available", header: "Available", align: "right", render: (w) => w.qty - w.reserved },
    {
      key: "sellable", header: "Sellable", render: (w) => (
        <StatusPill tone={w.sellable ? "ok" : "danger"}>{w.sellable ? "Sellable (CoA approved)" : "Blocked — CoA not approved"}</StatusPill>
      ),
    },
  ];

  const warehouses = Array.from(new Set(WAREHOUSE_STOCK.map((w) => w.warehouse)));

  return (
    <Shell active="/seller/inventory" breadcrumb={["Seller Central", "Inventory"]} title="Inventory">
      <div className="vh-grid cols-3" style={{ marginBottom: 18 }}>
        <Card title="Warehouses">
          <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>{warehouses.length}</div>
          <div className="small muted">{warehouses.join(", ")}</div>
        </Card>
        <Card title="Batches tracked">
          <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>{WAREHOUSE_STOCK.length}</div>
          <div className="small muted">Across all live and draft products</div>
        </Card>
        <Card title="Low-stock lines">
          <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>{WAREHOUSE_STOCK.filter((w) => w.qty - w.reserved < LOW_STOCK_THRESHOLD).length}</div>
          <div className="small muted">Below {LOW_STOCK_THRESHOLD}-unit threshold</div>
        </Card>
      </div>

      <Banner severity="info" title="FEFO — First-Expiry, First-Out" icon="⏳">
        Outbound picking always allocates the batch with the nearest expiry date first, provided it is sellable
        (CoA approved). A newer batch cannot be shipped ahead of an older approved one.
      </Banner>

      <div style={{ height: 16 }} />

      <Card pad0>
        <DataTable columns={columns} rows={WAREHOUSE_STOCK} empty={<div className="vh-empty">No stock recorded yet.</div>} />
      </Card>
    </Shell>
  );
}
