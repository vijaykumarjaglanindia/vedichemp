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
  body: string;
  status: "DRAFT" | "PUBLISHED";
  updatedAt: string;
  /** Sample posts are high-traffic: deleting them is maker–checker gated. */
  sample?: boolean;
}

export const SAMPLE_POSTS: CmsPost[] = [
  {
    slug: "how-to-read-a-lab-report",
    title: "How to read a batch lab report",
    status: "PUBLISHED",
    updatedAt: "2026-07-01",
    sample: true,
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
  return [...bySlug.values()].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
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

/** Escape-then-format markdown-lite: ## headings, **bold**, paragraphs.
 *  HTML is escaped BEFORE any formatting, so stored content can never
 *  inject markup. */
export function renderMarkdownLite(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((block) => {
      const b = block.trim();
      if (!b) return "";
      if (b.startsWith("## ")) return `<h2>${b.slice(3)}</h2>`;
      const withBold = b.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      return `<p>${withBold.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
}
