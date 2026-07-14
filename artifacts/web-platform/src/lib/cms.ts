import "server-only";

/**
 * VEDIC HEMP — CMS CONTENT (WordPress-style draft → publish)
 *
 * Posts move through DRAFT → PUBLISHED → (unpublish → DRAFT), edited from the
 * admin editor and rendered on the public /blog. Rules:
 *  - Only PUBLISHED posts are publicly visible; drafts render solely through
 *    the admin preview (signed admin session required) — never to visitors.
 *  - Every save passes the same claims copy-check as product copy: no
 *    surface on this platform may carry a disease claim.
 *  - Demo persistence is a SERVER-side override store keyed by slug (a
 *    module-level map — publishing must be visible to every visitor, not
 *    just the author's browser). It resets on server restart; with the DB
 *    attached this becomes a versioned `cms_post` table.
 */

export interface CmsPost {
  slug: string;
  title: string;
  /** Scheduled publishing: goes live automatically once this time passes. */
  publishAt?: string;
  body: string;
  status: "DRAFT" | "PUBLISHED";
  updatedAt: string;
  /** Sample posts are high-traffic: deleting them is maker–checker gated. */
  sample?: boolean;
  /* ── Rich content (world-class CMS) ── all optional so samples still work */
  excerpt?: string;         // short summary for the list + SEO fallback
  coverImage?: string;      // featured image (data URL)
  category?: string;        // one editorial category
  tags?: string[];          // free-text tags (filterable)
  author?: string;          // byline
  metaTitle?: string;       // SEO <title> override
  metaDescription?: string; // SEO meta description
}

/** Editorial post categories (WordPress-style taxonomy). */
export const POST_CATEGORIES = ["Guides", "Lab & testing", "Recipes", "Licensing", "Wellness", "News"] as const;

export const SAMPLE_POSTS: CmsPost[] = [
  {
    slug: "how-to-read-a-lab-report",
    title: "How to read a batch lab report",
    status: "PUBLISHED",
    updatedAt: "2026-07-01",
    sample: true,
    category: "Lab & testing",
    author: "Vedic Hemp Compliance",
    tags: ["lab report", "coa", "safety"],
    excerpt: "The three lines on a Certificate of Analysis that actually tell you whether a batch is safe to buy.",
    body:
      "Every regulated listing on Vedic Hemp links the lab report for its exact batch.\n\n" +
      "## The three lines that matter\n\n" +
      "**THC content** — must read at or below 0.3% for CBD wellness products.\n\n" +
      "**Batch code** — match it against the code printed on your unit. A report for a different batch tells you nothing about yours.\n\n" +
      "**Lab accreditation** — the testing lab's NABL number appears in the header.\n\n" +
      "If any of the three is missing, don't buy — and report the listing from the product page.",
  },
  {
    slug: "hemp-seed-oil-in-the-kitchen",
    title: "Hemp seed oil in the Indian kitchen",
    status: "PUBLISHED",
    updatedAt: "2026-06-24",
    sample: true,
    category: "Recipes",
    author: "Vedic Hemp Kitchen",
    tags: ["hemp oil", "cooking", "nutrition"],
    excerpt: "A finishing oil, not a frying oil — where cold-pressed hemp seed oil shines, and where it doesn't.",
    body:
      "Cold-pressed hemp seed oil is a finishing oil, not a frying oil.\n\n" +
      "## Where it shines\n\n" +
      "Drizzle it over dal after tempering, whisk it into chutneys, or use it in salad dressings. Its nutty flavour pairs well with jaggery and tamarind.\n\n" +
      "## Where it doesn't\n\n" +
      "High heat breaks it down — keep it away from the tadka pan. Store it refrigerated after opening.",
  },
  {
    slug: "what-ayush-licensing-means",
    title: "What AYUSH licensing actually covers",
    status: "PUBLISHED",
    updatedAt: "2026-06-10",
    sample: true,
    category: "Licensing",
    author: "Vedic Hemp Compliance",
    tags: ["ayush", "licensing", "compliance"],
    excerpt: "A licence is not a medical claim. What AYUSH manufacturing and marketing licences actually cover — and what they don't.",
    body:
      "Sellers of Ayurvedic and CBD wellness products on Vedic Hemp hold AYUSH manufacturing or marketing licences.\n\n" +
      "## What the licence covers\n\n" +
      "The specific formulations a manufacturer may produce, the facility standards, and the labelling rules.\n\n" +
      "## What it does not cover\n\n" +
      "A licence is not a medical claim. No product on this marketplace claims to cure, treat or prevent any disease — that language is rejected by the platform's copy-check, on every surface, including this journal.",
  },
];

const MAX_POSTS = 12;
export const MAX_BODY = 900;

// Server-side demo store — the seam where db.cmsPost attaches (PRODUCTION.md).
const g = globalThis as unknown as { __vhCmsOverrides?: Record<string, CmsPost> };
function store(): Record<string, CmsPost> {
  g.__vhCmsOverrides ??= {};
  return g.__vhCmsOverrides;
}

export async function readPostOverrides(): Promise<Record<string, CmsPost>> {
  return store();
}

export async function writePostOverride(post: CmsPost): Promise<"ok" | "limit"> {
  const map = store();
  const isNew = !(post.slug in map) && !SAMPLE_POSTS.some((p) => p.slug === post.slug);
  const newCount = Object.keys(map).filter((s) => !SAMPLE_POSTS.some((p) => p.slug === s)).length;
  if (isNew && newCount >= MAX_POSTS) return "limit";
  map[post.slug] = post;
  return "ok";
}

export async function deletePostOverride(slug: string): Promise<void> {
  delete store()[slug];
}

/** Sample baseline shadowed by cookie overrides, newest first. */
export async function allPosts(): Promise<CmsPost[]> {
  const overrides = await readPostOverrides();
  const bySlug = new Map<string, CmsPost>();
  for (const p of SAMPLE_POSTS) bySlug.set(p.slug, p);
  for (const [slug, p] of Object.entries(overrides)) {
    bySlug.set(slug, { ...p, sample: SAMPLE_POSTS.some((s) => s.slug === slug) });
  }
  return [...bySlug.values()].map(withEffectiveStatus).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function publishedPosts(): Promise<CmsPost[]> {
  return (await allPosts()).filter((p) => p.status === "PUBLISHED");
}

export async function findPost(slug: string): Promise<CmsPost | undefined> {
  return (await allPosts()).find((p) => p.slug === slug);
}

export function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

/** The list/SEO summary: the author's excerpt, else the first line of the body. */
export function postExcerpt(p: CmsPost, max = 160): string {
  const base = (p.excerpt && p.excerpt.trim()) || p.body.replace(/[#*_>`-]/g, " ").replace(/\s+/g, " ").trim();
  return base.length > max ? `${base.slice(0, max).trimEnd()}…` : base;
}

/** Every tag used across published posts (for the public tag filter). */
export async function allPostTags(): Promise<string[]> {
  const set = new Set<string>();
  for (const p of await publishedPosts()) for (const t of p.tags ?? []) set.add(t);
  return [...set].sort();
}

/** Merge a partial change into an existing post (cover, meta) and re-save. */
export async function patchPost(slug: string, patch: Partial<CmsPost>): Promise<boolean> {
  const post = await findPost(slug);
  if (!post) return false;
  await writePostOverride({ ...post, ...patch, slug: post.slug, updatedAt: new Date().toISOString().slice(0, 10) });
  return true;
}

export async function setPostCover(slug: string, dataUrl: string): Promise<boolean> {
  return patchPost(slug, { coverImage: dataUrl });
}
export async function removePostCover(slug: string): Promise<boolean> {
  return patchPost(slug, { coverImage: undefined });
}

/** Escape-then-format markdown-lite — shared core in src/lib/richtext.ts. */
export { mdToHtml as renderMarkdownLite } from "@/lib/richtext";

/* ── Scheduled publishing ────────────────────────────────────────── */

/** A scheduled DRAFT becomes PUBLISHED the moment its time passes. */
export function withEffectiveStatus(p: CmsPost): CmsPost {
  if (p.status === "DRAFT" && p.publishAt && p.publishAt <= new Date().toISOString()) {
    return { ...p, status: "PUBLISHED" };
  }
  return p;
}

/* ── Revisions (WordPress-style, last 10 per post) ───────────────── */

export interface PostRevision {
  at: string;
  by: string;
  title: string;
  body: string;
}

const r = globalThis as unknown as { __vhCmsRevisions?: Record<string, PostRevision[]> };
function revisionStore(): Record<string, PostRevision[]> {
  r.__vhCmsRevisions ??= {};
  return r.__vhCmsRevisions;
}

export async function pushRevision(slug: string, rev: PostRevision): Promise<void> {
  const list = (revisionStore()[slug] ??= []);
  list.unshift(rev);
  if (list.length > 10) list.length = 10;
}

export async function listRevisions(slug: string): Promise<PostRevision[]> {
  return revisionStore()[slug] ?? [];
}
