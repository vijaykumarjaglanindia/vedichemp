/**
 * VEDIC HEMP — SELLER PRODUCTS (§2.3)
 *
 * Regulated items show a per-product CoA snapshot: a product with any batch
 * missing an APPROVED, batch-matched CoA is flagged even while it stays LIVE
 * on older, already-approved stock (A2 is a batch-level gate).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Search, PackagePlus, Upload, Pencil, FlaskConical } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, DataTable, StatusPill, toneForStatus, ComplianceBadge, MoneyText, type Column } from "@/components/ui";
import { BarList } from "@/components/ui/charts";
import { getSession } from "@/lib/auth-lite";
import { REGULATED_CLASSES, sellerListings, type CatalogProduct } from "@/lib/catalog";
import { bulkUploadListings } from "../actions";
import { LISTING_QUALITY } from "../_lib/data";

export const metadata: Metadata = { title: "Products" };

const STATUS_TABS = ["ALL", "LIVE", "UNDER_REVIEW", "DRAFT", "ARCHIVED"] as const;

function coaSummary(p: CatalogProduct): { tone: "ok" | "warn" | "danger" | "neutral"; text: string } {
  if (!REGULATED_CLASSES.includes(p.cls)) return { tone: "neutral", text: "Not regulated" };
  if (p.coaState === "APPROVED") return { tone: "ok", text: "Approved" };
  if (p.coaState === "PENDING_REVIEW") return { tone: "warn", text: "Under review" };
  if (p.coaState === "REJECTED") return { tone: "danger", text: "Rejected" };
  return { tone: "danger", text: "No CoA yet" };
}

export default async function SellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; submitted?: string; deleted?: string; bulk?: string; bulkerr?: string }>;
}) {
  const { status: rawStatus, q, submitted, deleted, bulk, bulkerr } = await searchParams;
  const bulkReport = bulk ? globalThis.__vhBulkReports?.["seller"] : undefined;
  const status = STATUS_TABS.includes(rawStatus as (typeof STATUS_TABS)[number])
    ? (rawStatus as (typeof STATUS_TABS)[number])
    : "ALL";
  const query = (q ?? "").trim().toLowerCase();

  // The live catalog store: this storefront's launch listings plus everything
  // created in Seller Central — one list, one lifecycle, no cookie shadow copy.
  const session = await getSession();
  const listings = await sellerListings(session?.email ?? "seller@example.in", "Vedic Botanicals");

  const rows = listings
    .filter((p) => (status === "ALL" ? true : p.status === status))
    .filter((p) => (query ? p.title.toLowerCase().includes(query) : true));

  const columns: Column<CatalogProduct>[] = [
    {
      key: "title", header: "Product", render: (p) => (
        <span className="vh-row" style={{ gap: 10 }}>
          <span aria-hidden style={{ fontSize: "1.5rem" }}>{p.emoji}</span>
          <span>
            <div style={{ fontWeight: 600 }}><Link href={`/seller/products/${p.id}`}>{p.title}</Link></div>
            <span className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
              <ComplianceBadge cls={p.cls} />
              {p.claimsStrike && <StatusPill tone="danger">Ad-barred · claims attempt</StatusPill>}
            </span>
          </span>
        </span>
      ),
    },
    { key: "price", header: "Price", align: "right", render: (p) => <MoneyText paise={p.pricePaise} /> },
    { key: "state", header: "Listing", render: (p) => <StatusPill tone={toneForStatus(p.status)}>{p.status}</StatusPill> },
    {
      key: "coa", header: "CoA status", render: (p) => {
        const s = coaSummary(p);
        return <StatusPill tone={s.tone}>{s.text}</StatusPill>;
      },
    },
    {
      key: "actions", header: "", align: "right", render: (p) => (
        <span className="vh-row" style={{ gap: 4, justifyContent: "flex-end" }}>
          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/seller/products/${p.id}`} aria-label={`Edit ${p.title}`}>
            <Pencil size={14} strokeWidth={2.2} aria-hidden />
          </Link>
          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/seller/products/${p.id}#coa-upload`} aria-label={`Upload lab report for ${p.title}`}>
            <FlaskConical size={14} strokeWidth={2.2} aria-hidden />
          </Link>
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
          <Link className="vh-btn vh-btn-sm vh-btn-primary" href="/seller/products/new" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <PackagePlus size={14} strokeWidth={2.2} aria-hidden /> Add product
          </Link>
        </span>
      }
    >
      {submitted && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title={submitted === "draft" ? "Draft saved" : "Submitted for review"}>
            {submitted === "draft"
              ? "The listing is saved as DRAFT — finish it any time from this list."
              : "Compliance reviews new listings within a few business days. A regulated listing also needs an approved, batch-matched CoA before it can go live."}
          </Banner>
        </div>
      )}
      {deleted && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="Listing deleted">
            The draft was permanently removed. Listings that have sold stay archived instead — order history never dangles.
          </Banner>
        </div>
      )}
      {bulkReport && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity={bulkReport.rejected.length ? "warn" : "ok"} title={`Bulk upload: ${bulkReport.created.length} draft(s) created, ${bulkReport.rejected.length} row(s) rejected`}>
            {bulkReport.created.length > 0 && <>Created: {bulkReport.created.join(" · ")}. </>}
            {bulkReport.rejected.length > 0 && (
              <>Rejected — {bulkReport.rejected.map((r) => `row ${r.row}: ${r.reason}`).join("; ")}.</>
            )}
          </Banner>
        </div>
      )}
      {bulkerr && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger" title="Bulk upload failed">
            {bulkerr === "size" ? "File too large — keep it under 200 KB (≈50 rows)." : "Choose a CSV file first."}
          </Banner>
        </div>
      )}

      {/* Toolbar */}
      <div className="vh-row-between" style={{ marginBottom: "var(--sp-3)", flexWrap: "wrap", gap: 8 }}>
        <form method="GET" className="vh-row" style={{ gap: 8, flex: "1 1 280px", maxWidth: 420 }}>
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
            const label = t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, " ");
            return (
              <Link key={t} href={href} className={t === status ? "on" : undefined} aria-current={t === status ? "true" : undefined}>
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Card pad0>
        <DataTable
          columns={columns}
          rows={rows}
          empty={<div className="vh-empty">No products match — clear the search or <Link href="/seller/products/new">add your first product</Link>.</div>}
        />
      </Card>
      <p className="small muted" style={{ margin: "8px 0 var(--sp-4)" }}>
        Regulated classes (CBD Wellness, Medical Cannabis) display CoA status per batch. A batch without an APPROVED,
        batch-matched Certificate of Analysis cannot be published — see each product for the batch breakdown.
      </p>

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <Card title="Listing quality" action={<span className="small muted">Across {listings.length} listings</span>}>
          <BarList items={LISTING_QUALITY} />
          <p className="small muted" style={{ marginBottom: 0, marginTop: 12 }}>
            Better images and complete attributes lift search rank; CoA coverage is a hard publish gate, not a score.
          </p>
        </Card>
        <Card title="Bulk upload (CSV)">
          <form action={bulkUploadListings} className="vh-grid" style={{ gap: 10 }} id="bulk-upload">
            <label className="vh-dropzone" style={{ cursor: "pointer" }}>
              <input type="file" name="csv" accept=".csv,text/csv,text/plain" required style={{ display: "block", margin: "0 auto 8px" }} aria-label="CSV file of listings" />
              <Upload size={20} strokeWidth={2.2} aria-hidden style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--vh-ink)" }}>Choose a CSV to create listings</div>
              <div className="small" style={{ marginTop: 4 }}>
                One row per listing: <span className="mono">title,class,pricePaise,mrpPaise,hsn,desc</span> ·
                class = HEMP_FOOD / AYURVEDA / CBD_WELLNESS · max 50 rows.
              </div>
            </label>
            <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit" style={{ justifySelf: "start" }}>Upload &amp; create drafts</button>
            <p className="small muted" style={{ margin: 0 }}>
              Every row passes the same server-side checks as the form — <strong>rows with medical-claims copy are
              rejected</strong> (no listing may make medical claims), and regulated rows still need an approved batch
              CoA before they can ever go live.
            </p>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
