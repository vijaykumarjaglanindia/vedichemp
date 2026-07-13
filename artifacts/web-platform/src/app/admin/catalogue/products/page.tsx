/**
 * VEDIC HEMP — ALL LISTINGS (admin, full control)
 *
 * Every listing on the marketplace in one manager — any status, any seller —
 * with a create form that works on a seller's behalf. Operational reach is
 * total; compliance reach is not: an admin-created listing starts in DRAFT
 * like everyone else's, goes LIVE only through review, and a regulated class
 * still needs its batch CoA approved (A2). Nothing here can conjure a
 * MED_CANNABIS listing (A1). Every action is audited with the seller it was
 * done for.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, PackagePlus, Pencil } from "lucide-react";
import { Shell } from "../../Shell";
import { Banner, Card, ComplianceBadge, DataTable, MoneyText, StatusPill, toneForStatus, type Column } from "@/components/ui";
import { readCatalog, REGULATED_CLASSES, type CatalogProduct } from "@/lib/catalog";
import { CLASS_META } from "@/lib/compliance";
import { SELLERS } from "@/lib/sample";
import { adminSaveListing } from "../../actions";

export const metadata: Metadata = { title: "All listings · Admin" };

const STATUS_TABS = ["ALL", "LIVE", "UNDER_REVIEW", "DRAFT", "SUSPENDED", "ARCHIVED"] as const;

const ERRORS: Record<string, string> = {
  title: "Title should be 8–150 characters.",
  claims: "Claims language rejected (cure/treat/prevent/heal) — the attempt was logged.",
  price: "Selling price must be a positive integer in paise.",
  mrp: "MRP must be an integer in paise, at or above the selling price.",
  hsn: "HSN code should be 4–8 digits.",
  seller: "Pick the seller this listing belongs to.",
  cls: "That class can't be created from any console — MED_CANNABIS listings are never conjured by an admin (A1).",
};

export default async function AdminAllListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; err?: string; deleted?: string }>;
}) {
  const { status: rawStatus, q, err, deleted } = await searchParams;
  const status = STATUS_TABS.includes(rawStatus as (typeof STATUS_TABS)[number])
    ? (rawStatus as (typeof STATUS_TABS)[number])
    : "ALL";
  const query = (q ?? "").trim().toLowerCase();
  const catalog = await readCatalog();
  const rows = catalog
    .filter((p) => (status === "ALL" ? true : p.status === status))
    .filter((p) => (query ? `${p.title} ${p.seller}`.toLowerCase().includes(query) : true));

  const columns: Column<CatalogProduct>[] = [
    { key: "title", header: "Product", render: (p) => (
        <span className="vh-row" style={{ gap: 10 }}>
          <span aria-hidden style={{ fontSize: "1.4rem" }}>{p.emoji}</span>
          <span>
            <div style={{ fontWeight: 600 }}><Link href={`/admin/catalogue/products/${p.id}`}>{p.title}</Link></div>
            <ComplianceBadge cls={p.cls} />
          </span>
        </span>
      ) },
    { key: "seller", header: "Seller", render: (p) => (
        <span>
          {p.seller}
          {p.sellerEmail?.startsWith("obo:") && <div className="small muted">created by admin</div>}
        </span>
      ) },
    { key: "price", header: "Price", align: "right", render: (p) => <MoneyText paise={p.pricePaise} /> },
    { key: "coa", header: "CoA", render: (p) =>
        REGULATED_CLASSES.includes(p.cls)
          ? <StatusPill tone={p.coaState === "APPROVED" ? "ok" : p.coaState === "PENDING_REVIEW" ? "warn" : "danger"}>{p.coaState.replace(/_/g, " ")}</StatusPill>
          : <StatusPill tone="neutral">n/a</StatusPill> },
    { key: "state", header: "Status", render: (p) => <StatusPill tone={toneForStatus(p.status)}>{p.status.replace(/_/g, " ")}</StatusPill> },
    { key: "actions", header: "", align: "right", render: (p) => (
        <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/catalogue/products/${p.id}`} aria-label={`Manage ${p.title}`}>
          <Pencil size={14} strokeWidth={2.2} aria-hidden /> Manage
        </Link>
      ) },
  ];

  return (
    <Shell
      active="/admin/catalogue"
      breadcrumb={["Admin", "Catalogue", "All listings"]}
      title="All listings"
      actions={
        <Link href="/admin/catalogue" className="vh-btn vh-btn-sm vh-btn-ghost vh-row" style={{ gap: 6 }}>
          <ArrowLeft size={14} strokeWidth={2.2} aria-hidden /> Moderation queues
        </Link>
      }
    >
      {deleted && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="Listing deleted">The reason is in the audit trail alongside who deleted it and for which seller.</Banner>
        </div>
      )}
      {err && ERRORS[err] && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger" title="That didn't go through">{ERRORS[err]}</Banner>
        </div>
      )}

      {/* Toolbar */}
      <div className="vh-row-between" style={{ marginBottom: "var(--sp-3)", flexWrap: "wrap", gap: 8 }}>
        <form method="GET" className="vh-row" style={{ gap: 8, flex: "1 1 280px", maxWidth: 420 }}>
          {status !== "ALL" && <input type="hidden" name="status" value={status} />}
          <input className="vh-input" type="search" name="q" defaultValue={q ?? ""} placeholder="Search title or seller…" aria-label="Search listings" />
          <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Search</button>
        </form>
        <nav className="vh-seg" aria-label="Status filter">
          {STATUS_TABS.map((t) => {
            const hrefTab = t === "ALL"
              ? `/admin/catalogue/products${query ? `?q=${encodeURIComponent(query)}` : ""}`
              : `/admin/catalogue/products?status=${t}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
            return (
              <Link key={t} href={hrefTab} className={t === status ? "on" : undefined} aria-current={t === status ? "true" : undefined}>
                {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, " ")}
              </Link>
            );
          })}
        </nav>
      </div>

      <Card pad0>
        <DataTable columns={columns} rows={rows} empty={<div className="vh-empty">No listings match.</div>} />
      </Card>

      {/* ── Create on behalf of a seller ──────────────────── */}
      <div id="create-obo" style={{ marginTop: "var(--sp-4)" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><PackagePlus size={16} strokeWidth={2.2} aria-hidden /> Create a listing on behalf of a seller</span>}>
          <p className="small muted" style={{ marginTop: 0 }}>
            For sellers who onboard by phone or email. The listing is created in DRAFT under the seller&apos;s
            storefront, goes LIVE only through review, and a regulated class still needs its batch CoA
            approved first (A2) — creating for someone is not approving for them.
          </p>
          <form action={adminSaveListing} className="vh-grid" style={{ gap: 14 }}>
            <div className="vh-grid cols-2" style={{ gap: 14 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="obo-seller">Seller <span className="req">*</span></label>
                <select className="vh-input" id="obo-seller" name="seller" defaultValue="">
                  <option value="" disabled>Choose the storefront…</option>
                  {SELLERS.filter((s) => s.kycState === "KYC_APPROVED").map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
                <span className="vh-help">Only KYC-approved sellers can receive listings.</span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="obo-cls">Compliance class <span className="req">*</span></label>
                <select className="vh-input" id="obo-cls" name="cls" defaultValue="HEMP_FOOD">
                  {(["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"] as const).map((c) => (
                    <option key={c} value={c}>{CLASS_META[c].label}</option>
                  ))}
                </select>
                <span className="vh-help">MED_CANNABIS is not offered here and is refused server-side (A1).</span>
              </div>
            </div>
            <div className="vh-field">
              <label className="vh-label" htmlFor="obo-title">Title <span className="req">*</span></label>
              <input className="vh-input" id="obo-title" name="title" type="text" maxLength={150} placeholder="Product + format + size" />
            </div>
            <div className="vh-grid cols-3" style={{ gap: 14 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="obo-price">Price (paise) <span className="req">*</span></label>
                <input className="vh-input" id="obo-price" name="pricePaise" type="number" min={0} step={1} placeholder="49900" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="obo-mrp">MRP (paise) <span className="req">*</span></label>
                <input className="vh-input" id="obo-mrp" name="mrpPaise" type="number" min={0} step={1} placeholder="59900" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="obo-hsn">HSN <span className="req">*</span></label>
                <input className="vh-input mono" id="obo-hsn" name="hsn" type="text" maxLength={8} placeholder="30049011" />
              </div>
            </div>
            <button className="vh-btn vh-btn-primary" type="submit" style={{ justifySelf: "start" }}>Create as DRAFT</button>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
