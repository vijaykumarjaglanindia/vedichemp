/**
 * VEDIC HEMP — SELLER PRODUCTS (§2.3)
 *
 * Regulated items show a per-product CoA snapshot: a product with any batch
 * missing an APPROVED, batch-matched CoA is flagged even while it stays LIVE
 * on older, already-approved stock (A2 is a batch-level gate).
 */

import type { Metadata } from "next";
import { Search, PackagePlus, Upload, Pencil, FlaskConical } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, DataTable, StatusPill, toneForStatus, ComplianceBadge, MoneyText, type Column } from "@/components/ui";
import { BarList } from "@/components/ui/charts";
import { ComplianceClass } from "@prisma/client";
import { readSubmittedProducts } from "@/lib/engage";
import { SELLER_PRODUCTS, LISTING_QUALITY, type SellerProduct } from "../_lib/data";

export const metadata: Metadata = { title: "Products" };

const STATUS_TABS = ["ALL", "LIVE", "DRAFT"] as const;

function coaSummary(p: SellerProduct): { tone: "ok" | "warn" | "danger" | "neutral"; text: string } {
  if (p.batches.length === 0) return { tone: "neutral", text: "No batches yet" };
  if (p.batches.some((b) => b.coaStatus === "MISSING" || b.coaStatus === "REJECTED")) return { tone: "danger", text: "Action needed" };
  if (p.batches.some((b) => b.coaStatus === "PENDING_REVIEW")) return { tone: "warn", text: "Under review" };
  return { tone: "ok", text: "All approved" };
}

export default async function SellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; submitted?: string }>;
}) {
  const { status: rawStatus, q, submitted } = await searchParams;
  const status = STATUS_TABS.includes(rawStatus as (typeof STATUS_TABS)[number])
    ? (rawStatus as (typeof STATUS_TABS)[number])
    : "ALL";
  const query = (q ?? "").trim().toLowerCase();

  // Listings created via Add product in this session (server-written cookie;
  // db.product rows once the DB is attached). Regulated ones start with an
  // empty batch list, so the CoA column correctly reads "No batches yet".
  const mine: SellerProduct[] = (await readSubmittedProducts()).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.id,
    cls: p.cls as ComplianceClass,
    pricePaise: p.pricePaise,
    mrpPaise: p.mrpPaise,
    seller: "Vedic Botanicals",
    rating: 0,
    emoji: "🆕",
    labVerified: false,
    state: p.listingState,
    hsn: p.hsn,
    listingState: p.listingState,
    batches: [],
  }));

  const rows = [...mine, ...SELLER_PRODUCTS]
    .filter((p) => (status === "ALL" ? true : p.listingState === status))
    .filter((p) => (query ? p.title.toLowerCase().includes(query) : true));

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
    { key: "batches", header: "Batches", align: "right", render: (p) => <span className="tabular">{p.batches.length}</span> },
    {
      key: "actions", header: "", align: "right", render: (p) => (
        <span className="vh-row" style={{ gap: 4, justifyContent: "flex-end" }}>
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/seller/products/${p.id}`} aria-label={`Edit ${p.title}`}>
            <Pencil size={14} strokeWidth={2.2} aria-hidden />
          </a>
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/seller/products/${p.id}#coa-upload`} aria-label={`Upload lab report for ${p.title}`}>
            <FlaskConical size={14} strokeWidth={2.2} aria-hidden />
          </a>
        </span>
      ),
    },
  ];

  return (
    <Shell
      active="/seller/products"
      breadcrumb={["Seller Central", "Products"]}
      title="Products"
      actions={
        <span className="vh-row" style={{ gap: 8 }}>
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href="#bulk-upload" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Upload size={14} strokeWidth={2.2} aria-hidden /> Bulk upload
          </a>
          <a className="vh-btn vh-btn-sm vh-btn-primary" href="/seller/products/new" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <PackagePlus size={14} strokeWidth={2.2} aria-hidden /> Add product
          </a>
        </span>
      }
    >
      {submitted && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title={submitted === "draft" ? "Draft saved" : "Submitted for review"}>
            {submitted === "draft"
              ? "The listing is saved as DRAFT — finish it any time from this list."
              : "Compliance reviews new listings within a few business days. A regulated listing also needs an approved, batch-matched CoA before it can go live (A2)."}
          </Banner>
        </div>
      )}

      {/* Toolbar */}
      <div className="vh-row-between" style={{ marginBottom: "var(--sp-3)", flexWrap: "wrap", gap: 8 }}>
        <form method="GET" action="/seller/products" className="vh-row" style={{ gap: 8, flex: "1 1 280px", maxWidth: 420 }}>
          {status !== "ALL" && <input type="hidden" name="status" value={status} />}
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={15} strokeWidth={2.2} aria-hidden style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--vh-muted)" }} />
            <input
              className="vh-input"
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search products…"
              aria-label="Search products"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Search</button>
        </form>
        <nav className="vh-seg" aria-label="Listing status filter">
          {STATUS_TABS.map((t) => {
            const href = t === "ALL"
              ? `/seller/products${query ? `?q=${encodeURIComponent(query)}` : ""}`
              : `/seller/products?status=${t}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
            return (
              <a key={t} href={href} className={t === status ? "on" : undefined} aria-current={t === status ? "true" : undefined}>
                {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
              </a>
            );
          })}
        </nav>
      </div>

      <Card pad0>
        <DataTable
          columns={columns}
          rows={rows}
          empty={<div className="vh-empty">No products match — clear the search or <a href="/seller/products/new">add your first product</a>.</div>}
        />
      </Card>
      <p className="small muted" style={{ margin: "8px 0 var(--sp-4)" }}>
        Regulated classes (CBD Wellness, Medical Cannabis) display CoA status per batch. A batch without an APPROVED,
        batch-matched Certificate of Analysis cannot be published — see each product for the batch breakdown (A2).
      </p>

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <Card title="Listing quality" action={<span className="small muted">Across {SELLER_PRODUCTS.length} listings</span>}>
          <BarList items={LISTING_QUALITY} />
          <p className="small muted" style={{ marginBottom: 0, marginTop: 12 }}>
            Better images and complete attributes lift search rank; CoA coverage is a hard publish gate, not a score (A2).
          </p>
        </Card>
        <Card title="Bulk upload">
          <div id="bulk-upload" className="vh-dropzone">
            <Upload size={20} strokeWidth={2.2} aria-hidden style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--vh-ink)" }}>Drop a CSV to create or update listings</div>
            <div className="small" style={{ marginTop: 4 }}>Template includes HSN, class and batch columns. Regulated rows are created as DRAFT until each batch&rsquo;s CoA is approved.</div>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
