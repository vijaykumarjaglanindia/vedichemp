/**
 * VEDIC HEMP — CATEGORY LANDING (public, crawlable)
 *
 * A public, SEO-crawlable page for an admin-managed category (and its
 * sub-categories). It resolves the live catalogue for the category's class /
 * assignment and links its sub-categories.
 *
 * A1: a category may only ever resolve a HEMP_FOOD | AYURVEDA | CBD_WELLNESS
 * collection. CATEGORY_CLASSES excludes MED_CANNABIS at create time, but this
 * page guards again — a category whose class isn't in the viewer's permitted
 * set is "not available" (absent, not blurred), the same as an unknown slug.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, EmptyState, SectionHead } from "@/components/ui";
import { permittedClasses, CLASS_META } from "@/lib/compliance";
import { readLiveProducts } from "@/lib/catalog";
import { findCategory, subCategories, findCategoryById } from "@/lib/categories";
import { breadcrumbJsonLd } from "@/lib/seo";
import { ProductCard } from "../../_lib/ProductCard";

export const dynamic = "force-dynamic";

type Params = { slug: string };

async function resolve(slug: string) {
  const cat = await findCategory(slug);
  if (!cat || !cat.visible) return null;
  // A1 guard — the class must be one the viewer may see.
  if (cat.cls && !permittedClasses({ hasRx: false }).includes(cat.cls)) return null;
  return cat;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = await resolve(slug);
  if (!cat) return { title: "Category not available", robots: { index: false } };
  const title = `${cat.name} — Vedic Hemp`;
  const description = cat.blurb || `Shop ${cat.name} on Vedic Hemp — India's regulated hemp & wellness marketplace.`;
  const url = `/category/${slug}`;
  return {
    title, description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: "Vedic Hemp" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const cat = await resolve(slug);
  if (!cat) notFound();

  const permitted = permittedClasses({ hasRx: false });
  const live = await readLiveProducts();
  // Products in this category: an exact assignment (sub-categories), or the
  // category's whole class (top-level). A1 class filter always applies.
  const products = live.filter((p) => {
    if (!permitted.includes(p.cls)) return false;
    if (cat!.parentId) return p.categoryId === cat!.id;
    return p.categoryId === cat!.id || (cat!.cls ? p.cls === cat!.cls : false);
  });

  const subs = await subCategories(cat!.id);
  const parent = cat!.parentId ? await findCategoryById(cat!.parentId) : null;
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Shop", href: "/catalogue" },
    ...(parent ? [{ name: parent.name, href: `/category/${parent.slug}` }] : []),
    { name: cat!.name, href: `/category/${slug}` },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }} />
      <div className="vh-container" style={{ paddingTop: "var(--sp-4)", paddingBottom: "var(--sp-6)" }}>
        <nav className="small muted" style={{ marginBottom: "var(--sp-3)" }} aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={c.href}>
              {i > 0 && " / "}
              {i < crumbs.length - 1 ? <Link href={c.href}>{c.name}</Link> : <span>{c.name}</span>}
            </span>
          ))}
        </nav>

        <SectionHead
          eyebrow={cat!.cls ? CLASS_META[cat!.cls].label : "Collection"}
          title={`${cat!.emoji} ${cat!.name}`}
          sub={cat!.blurb}
        />

        {subs.length > 0 && (
          <div className="vh-row" style={{ gap: 8, flexWrap: "wrap", marginBottom: "var(--sp-4)" }}>
            {subs.map((s) => (
              <Link key={s.id} href={`/category/${s.slug}`} className="vh-pill vh-pill-neutral" style={{ textDecoration: "none" }}>
                {s.emoji} {s.name}
              </Link>
            ))}
          </div>
        )}

        {products.length === 0 ? (
          <Card>
            <EmptyState icon="🗂️" headline="Nothing here yet" sub="This collection has no products right now. Check back soon or browse the full catalogue." cta={{ label: "Browse all products", href: "/catalogue" }} />
          </Card>
        ) : (
          <>
            <div className="vh-row-between" style={{ marginBottom: "var(--sp-3)" }}>
              <span className="small muted">{products.length} product{products.length === 1 ? "" : "s"}</span>
              <Link className="small" href={`/catalogue?cat=${slug}`}>View all products →</Link>
            </div>
            <div className="vh-grid cols-4">
              {products.map((p) => <ProductCard key={p.id} p={p} actions />)}
            </div>
          </>
        )}
      </div>
    </>
  );
}
