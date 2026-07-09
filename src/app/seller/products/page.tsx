/**
 * VEDIC HEMP — SELLER PRODUCTS (§2.3)
 *
 * Regulated items show a per-product CoA snapshot: a product with any batch
 * missing an APPROVED, batch-matched CoA is flagged even while it stays LIVE
 * on older, already-approved stock (A2 is a batch-level gate).
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, DataTable, StatusPill, toneForStatus, ComplianceBadge, MoneyText, type Column } from "@/components/ui";
import { SELLER_PRODUCTS, type SellerProduct } from "../_lib/data";

export const metadata: Metadata = { title: "Products" };

function coaSummary(p: SellerProduct): { tone: "ok" | "warn" | "danger" | "neutral"; text: string } {
  if (p.batches.length === 0) return { tone: "neutral", text: "No batches yet" };
  if (p.batches.some((b) => b.coaStatus === "MISSING" || b.coaStatus === "REJECTED")) return { tone: "danger", text: "Action needed" };
  if (p.batches.some((b) => b.coaStatus === "PENDING_REVIEW")) return { tone: "warn", text: "Under review" };
  return { tone: "ok", text: "All approved" };
}

export default function SellerProductsPage() {
  const columns: Column<SellerProduct>[] = [
    {
      key: "title", header: "Product", render: (p) => (
        <span className="vh-row" style={{ gap: 10 }}>
          <span aria-hidden style={{ fontSize: "1.5rem" }}>{p.emoji}</span>
          <span>
            <div style={{ fontWeight: 600 }}><a href={`/seller/products/${p.id}`}>{p.title}</a></div>
            <ComplianceBadge cls={p.cls} />
          </span>
        </span>
      ),
    },
    { key: "price", header: "Price", align: "right", render: (p) => <MoneyText paise={p.pricePaise} /> },
    { key: "state", header: "Listing", render: (p) => <StatusPill tone={toneForStatus(p.listingState)}>{p.listingState}</StatusPill> },
    {
      key: "coa", header: "CoA status", render: (p) => {
        const s = coaSummary(p);
        return <StatusPill tone={s.tone}>{s.text}</StatusPill>;
      },
    },
    { key: "batches", header: "Batches", render: (p) => `${p.batches.length}` },
    { key: "actions", header: "", align: "right", render: (p) => <a className="small" href={`/seller/products/${p.id}`}>Edit →</a> },
  ];

  return (
    <Shell
      active="/seller/products"
      breadcrumb={["Seller Central", "Products"]}
      title="Products"
      actions={
        <span className="vh-row" style={{ gap: 8 }}>
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href="#bulk-upload">Bulk upload</a>
          <a className="vh-btn vh-btn-sm vh-btn-primary" href="/seller/products/new">+ Add product</a>
        </span>
      }
    >
      <Card pad0>
        <DataTable columns={columns} rows={SELLER_PRODUCTS} empty={<div className="vh-empty">No products yet — add your first product.</div>} />
      </Card>
      <p className="small muted" style={{ marginTop: 10 }}>
        Regulated classes (CBD Wellness, Medical Cannabis) display CoA status per batch. A batch without an APPROVED,
        batch-matched Certificate of Analysis cannot be published — see each product for the batch breakdown (A2).
      </p>
    </Shell>
  );
}
