/**
 * VEDIC HEMP — BUILT PAGE RENDERER (public)
 *
 * Renders admin-built pages block by block with the same components the rest
 * of the site uses. PUBLISHED renders for everyone; DRAFT renders only via
 * admin preview. Product-row blocks draw from the permitted-class universe
 * only (A1) — a builder page cannot surface what the catalogue itself hides.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Banner, EmptyState, SectionHead } from "@/components/ui";
import { getSession } from "@/lib/auth-lite";
import { findMedia, findPage, type Block } from "@/lib/pagebuilder";
import { mdToHtml } from "@/lib/richtext";
import { parseFaqs } from "@/lib/sitecontent";
import { publicProducts } from "../../_lib/data";
import { ProductCard } from "../../_lib/ProductCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await findPage(slug);
  if (!page || page.status !== "PUBLISHED") return { title: "Page not found", robots: { index: false } };
  const heroSub = page.blocks.find((b) => b.type === "hero")?.props.sub;
  return { title: page.title, description: heroSub ?? page.title, alternates: { canonical: `/p/${page.slug}` } };
}

async function BlockView({ block }: { block: Block }) {
  const p = block.props;
  switch (block.type) {
    case "hero":
      return (
        <section className="vh-hero" style={{ padding: "clamp(32px, 4vw, 52px) 0" }}>
          <div className="vh-container">
            {p.eyebrow && <span className="vh-eyebrow">{p.eyebrow}</span>}
            <h1 style={{ marginTop: 10 }}>{p.title}</h1>
            {p.sub && <p style={{ maxWidth: "60ch" }}>{p.sub}</p>}
            {p.ctaLabel && p.ctaHref && (
              <Link href={p.ctaHref} className="vh-btn vh-btn-primary" style={{ marginTop: 12 }}>
                {p.ctaLabel} <ArrowRight size={15} strokeWidth={2.2} aria-hidden />
              </Link>
            )}
          </div>
        </section>
      );
    case "richtext":
      return (
        <section className="vh-section" style={{ paddingTop: "var(--sp-4)", paddingBottom: 0 }}>
          <div className="vh-container" style={{ maxWidth: 760 }}>
            <div className="vh-prose" dangerouslySetInnerHTML={{ __html: mdToHtml(p.body ?? "") }} />
          </div>
        </section>
      );
    case "products": {
      const cls = (p.cls ?? "TOP").toUpperCase();
      const universe = await publicProducts();
      const items = (cls === "TOP" ? [...universe].sort((a, b) => b.rating - a.rating) : universe.filter((x) => x.cls === cls)).slice(0, 4);
      return (
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <div className="vh-container">
            <SectionHead eyebrow="Shop" title={p.heading ?? "Products"} />
            <div className="vh-grid cols-4">{items.map((x) => <ProductCard key={x.id} p={x} />)}</div>
          </div>
        </section>
      );
    }
    case "faq": {
      const faqs = parseFaqs(p.items ?? "");
      return (
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <div className="vh-container" style={{ maxWidth: 760 }}>
            <div style={{ display: "grid", gap: "var(--sp-2)" }}>
              {faqs.map((f) => (
                <details key={f.q} className="vh-card" style={{ padding: "var(--sp-3)" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 800, color: "var(--vh-ink)" }}>{f.q}</summary>
                  <div className="small muted vh-prose" style={{ marginTop: 10 }} dangerouslySetInnerHTML={{ __html: mdToHtml(f.a) }} />
                </details>
              ))}
            </div>
          </div>
        </section>
      );
    }
    case "cta":
      return (
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <div className="vh-container">
            <div className="vh-card" style={{ background: "var(--vh-green-50)" }}>
              <h3>{p.title}</h3>
              {p.body && <p className="small muted">{p.body}</p>}
              {p.ctaLabel && p.ctaHref && <Link href={p.ctaHref} className="vh-btn vh-btn-primary">{p.ctaLabel}</Link>}
            </div>
          </div>
        </section>
      );
    case "image": {
      const asset = p.mediaId ? await findMedia(p.mediaId) : undefined;
      return (
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <div className="vh-container" style={{ maxWidth: 760 }}>
            <figure style={{ margin: 0 }}>
              {asset ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URLs; swaps to next/image with object storage
                <img src={asset.dataUrl} alt={asset.alt} style={{ maxWidth: "100%", borderRadius: "var(--vh-radius)", display: "block" }} />
              ) : (
                <div className="vh-empty">Image unavailable</div>
              )}
              {p.caption && <figcaption className="small muted" style={{ marginTop: 6 }}>{p.caption}</figcaption>}
            </figure>
          </div>
        </section>
      );
    }
  }
}

export default async function BuiltPagePublic({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const page = await findPage(slug);

  let allowed = Boolean(page && page.status === "PUBLISHED");
  let isPreview = false;
  if (page && page.status === "DRAFT" && preview === "1") {
    const session = await getSession();
    if (session?.role === "ADMIN") {
      allowed = true;
      isPreview = true;
    }
  }

  if (!page || !allowed) {
    return (
      <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)" }}>
        <EmptyState icon="📄" headline="This page isn't available" sub="It may have been unpublished or the link is wrong." cta={{ label: "Back home", href: "/" }} />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: "var(--sp-7)" }}>
      {isPreview && (
        <div className="vh-container" style={{ paddingTop: "var(--sp-3)" }}>
          <Banner severity="warn" title="Draft preview — not public">Publish from the builder to make it live.</Banner>
        </div>
      )}
      {page.blocks.map((b) => <BlockView key={b.id} block={b} />)}
    </div>
  );
}
