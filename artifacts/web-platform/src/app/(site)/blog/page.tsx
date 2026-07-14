/**
 * VEDIC HEMP — WELLNESS JOURNAL (public blog)
 *
 * Renders PUBLISHED posts only — drafts are structurally absent from this
 * query, not filtered client-side. Content is educational: composition and
 * traditional use, never disease claims (enforced at save time by the CMS
 * copy-check).
 */

import type { Metadata } from "next";
import { readSiteContent } from "@/lib/sitecontent";
import Link from "next/link";
import { ArrowRight, Newspaper, UserRound } from "lucide-react";
import { SectionHead } from "@/components/ui";
import { allPostTags, postExcerpt, publishedPosts } from "@/lib/cms";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await readSiteContent();
  return {
    title: "Wellness journal",
    description: content.seoBlogDesc,
    alternates: { canonical: "/blog" },
  };
}

export default async function BlogIndexPage({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const { tag } = await searchParams;
  const all = await publishedPosts();
  const tags = await allPostTags();
  const activeTag = tag && tags.includes(tag) ? tag : null;
  const posts = activeTag ? all.filter((p) => (p.tags ?? []).includes(activeTag)) : all;

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)", maxWidth: 880 }}>
      <SectionHead
        eyebrow="Wellness journal"
        title="Reading worth your time"
        sub="Lab-report explainers, kitchen guides and licensing explainers. Educational only — nothing here claims to cure, treat or prevent any disease."
      />

      {tags.length > 0 && (
        <nav className="vh-row" style={{ gap: 8, flexWrap: "wrap", marginBottom: "var(--sp-4)" }} aria-label="Filter by tag">
          <Link href="/blog" className={`vh-pill ${activeTag ? "vh-pill-neutral" : "vh-pill-ok"}`} style={{ textDecoration: "none" }}>All</Link>
          {tags.map((t) => (
            <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className={`vh-pill ${activeTag === t ? "vh-pill-ok" : "vh-pill-neutral"}`} style={{ textDecoration: "none" }}>#{t}</Link>
          ))}
        </nav>
      )}

      <div style={{ display: "grid", gap: "var(--sp-3)" }}>
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="vh-card vh-rise" style={{ display: "flex", gap: "var(--sp-3)", textDecoration: "none", alignItems: "stretch", padding: p.coverImage ? 0 : undefined, overflow: "hidden" }}>
            {p.coverImage && (
              <div style={{ width: 180, flexShrink: 0, alignSelf: "stretch", minHeight: 120 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            <div style={{ padding: p.coverImage ? "var(--sp-3)" : 0, minWidth: 0 }}>
              <div className="vh-row" style={{ gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                {p.category && <span className="vh-pill vh-pill-info">{p.category}</span>}
                <span className="vh-row small muted" style={{ gap: 6 }}><Newspaper size={13} aria-hidden style={{ color: "var(--vh-accent)" }} /><span className="tabular">{p.updatedAt}</span></span>
                {p.author && <span className="vh-row small muted" style={{ gap: 4 }}><UserRound size={12} aria-hidden /> {p.author}</span>}
              </div>
              <h2 style={{ fontSize: "1.15rem", margin: "0 0 6px", color: "var(--vh-ink)" }}>{p.title}</h2>
              <p className="small muted" style={{ margin: 0 }}>{postExcerpt(p, 150)}</p>
              <span className="small vh-row" style={{ gap: 4, fontWeight: 700, marginTop: 10, color: "var(--vh-accent)" }}>
                Read <ArrowRight size={13} aria-hidden />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
