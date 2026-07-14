/**
 * VEDIC HEMP — JOURNAL POST (public render)
 *
 * A PUBLISHED post renders for everyone. A DRAFT renders ONLY through the
 * admin preview (?preview=1 with a signed ADMIN session) — any other visitor
 * gets the same not-found state as an unknown slug. Body HTML is escaped
 * before markdown-lite formatting, so stored content can never inject markup.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Banner, EmptyState } from "@/components/ui";
import { getSession } from "@/lib/auth-lite";
import { findPost, postExcerpt, renderMarkdownLite } from "@/lib/cms";
import { articleJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await findPost(slug);
  if (!post || post.status !== "PUBLISHED") return { title: "Post not found", robots: { index: false } };
  const title = post.metaTitle || post.title;
  const description = post.metaDescription || postExcerpt(post);
  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title, description, type: "article", url: `/blog/${post.slug}`, ...(post.coverImage ? { images: [post.coverImage] } : {}) },
  };
}

export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const post = await findPost(slug);

  let allowed = Boolean(post && post.status === "PUBLISHED");
  let isPreview = false;
  if (post && post.status === "DRAFT" && preview === "1") {
    const session = await getSession();
    if (session?.role === "ADMIN") {
      allowed = true;
      isPreview = true;
    }
  }

  if (!post || !allowed) {
    return (
      <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)" }}>
        <EmptyState
          icon="📰"
          headline="This post isn't available"
          sub="It may have been unpublished or the link is wrong."
          cta={{ label: "Back to the journal", href: "/blog" }}
        />
      </div>
    );
  }

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)", maxWidth: 720 }}>
      {isPreview && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="warn" title="Draft preview — not public">
            Only signed-in admins can see this. Publish it from the editor to make it live.
          </Banner>
        </div>
      )}
      <Link href="/blog" className="small vh-row" style={{ gap: 4, fontWeight: 700, marginBottom: "var(--sp-3)" }}>
        <ArrowLeft size={13} aria-hidden /> Wellness journal
      </Link>
      {!isPreview && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(post)) }} />
      )}
      <article>
        <div className="vh-row" style={{ gap: 10, flexWrap: "wrap", margin: "0 0 8px" }}>
          {post.category && <span className="vh-pill vh-pill-info">{post.category}</span>}
          <span className="small muted tabular">{post.updatedAt}</span>
          {post.author && <span className="small muted">· by {post.author}</span>}
        </div>
        <h1 style={{ marginBottom: post.coverImage ? "var(--sp-3)" : "var(--sp-3)" }}>{post.title}</h1>
        {post.coverImage && (
          <div style={{ aspectRatio: "16 / 9", borderRadius: "var(--vh-radius)", overflow: "hidden", border: "1px solid var(--vh-line)", margin: "0 0 var(--sp-4)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div
          className="vh-prose"
          // Safe: renderMarkdownLite escapes all HTML before formatting.
          dangerouslySetInnerHTML={{ __html: renderMarkdownLite(post.body) }}
        />
        {post.tags && post.tags.length > 0 && (
          <div className="vh-row" style={{ gap: 6, flexWrap: "wrap", marginTop: "var(--sp-4)" }}>
            {post.tags.map((t) => (
              <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="vh-pill vh-pill-neutral" style={{ textDecoration: "none" }}>#{t}</Link>
            ))}
          </div>
        )}
      </article>
      <p className="small muted" style={{ marginTop: "var(--sp-5)", borderTop: "1px solid var(--vh-line)", paddingTop: "var(--sp-3)" }}>
        Educational content only. Nothing on Vedic Hemp claims to cure, treat or prevent any disease.
      </p>
    </div>
  );
}
