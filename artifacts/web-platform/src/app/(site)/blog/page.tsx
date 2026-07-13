/**
 * VEDIC HEMP — WELLNESS JOURNAL (public blog)
 *
 * Renders PUBLISHED posts only — drafts are structurally absent from this
 * query, not filtered client-side. Content is educational: composition and
 * traditional use, never disease claims (enforced at save time by the CMS
 * copy-check).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { SectionHead } from "@/components/ui";
import { publishedPosts } from "@/lib/cms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wellness journal",
  description: "Lab-report explainers, hemp nutrition guides and licensing explainers from Vedic Hemp. Educational only — no health claims, ever.",
};

export default async function BlogIndexPage() {
  const posts = await publishedPosts();

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)", maxWidth: 880 }}>
      <SectionHead
        eyebrow="Wellness journal"
        title="Reading worth your time"
        sub="Lab-report explainers, kitchen guides and licensing explainers. Educational only — nothing here claims to cure, treat or prevent any disease."
      />
      <div style={{ display: "grid", gap: "var(--sp-3)" }}>
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="vh-card vh-rise" style={{ display: "block", textDecoration: "none" }}>
            <div className="vh-row" style={{ gap: 10, marginBottom: 6 }}>
              <Newspaper size={15} aria-hidden style={{ color: "var(--vh-accent)" }} />
              <span className="small muted tabular">{p.updatedAt}</span>
            </div>
            <h2 style={{ fontSize: "1.15rem", margin: "0 0 6px", color: "var(--vh-ink)" }}>{p.title}</h2>
            <p className="small muted" style={{ margin: 0 }}>
              {p.body.replace(/[#*]/g, "").slice(0, 140)}…
            </p>
            <span className="small vh-row" style={{ gap: 4, fontWeight: 700, marginTop: 10, color: "var(--vh-accent)" }}>
              Read <ArrowRight size={13} aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
