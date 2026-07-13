/**
 * VEDIC HEMP — PAGE BUILDER + MEDIA LIBRARY (WordPress-style, server-side)
 *
 * Pages are assembled from typed blocks — hero, rich text, product row,
 * FAQ, CTA band, image — edited block-by-block in the admin with plain
 * forms and server actions (works without client JS, like classic WP).
 * Every text prop passes the claims copy-check on save; rich text renders
 * through the escape-first pipeline, so a block can never inject markup.
 *
 * Stores are the DB seam (Page, PageBlock, MediaAsset tables in prod).
 */

export type BlockType = "hero" | "richtext" | "products" | "faq" | "cta" | "image";

export interface Block {
  id: string;
  type: BlockType;
  /** String props only — everything is form-editable text. */
  props: Record<string, string>;
}

export interface BuiltPage {
  slug: string;
  title: string;
  status: "DRAFT" | "PUBLISHED";
  blocks: Block[];
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  alt: string;
  /** data: URL — the R2/S3 seam; swap for an object-storage URL in prod. */
  dataUrl: string;
  addedAt: string;
}

export const BLOCK_META: Record<BlockType, { label: string; fields: { key: string; label: string; kind: "text" | "rich"; max: number; help?: string }[] }> = {
  hero: {
    label: "Hero band",
    fields: [
      { key: "eyebrow", label: "Eyebrow", kind: "text", max: 40 },
      { key: "title", label: "Headline", kind: "text", max: 90 },
      { key: "sub", label: "Subheadline", kind: "text", max: 300 },
      { key: "ctaLabel", label: "Button label", kind: "text", max: 40 },
      { key: "ctaHref", label: "Button link", kind: "text", max: 120, help: "Internal path, e.g. /catalogue" },
    ],
  },
  richtext: {
    label: "Rich text",
    fields: [{ key: "body", label: "Body", kind: "rich", max: 2000 }],
  },
  products: {
    label: "Product row",
    fields: [
      { key: "heading", label: "Heading", kind: "text", max: 80 },
      { key: "cls", label: "Category (HEMP_FOOD / AYURVEDA / CBD_WELLNESS / TOP)", kind: "text", max: 20, help: "TOP = bestsellers across permitted classes" },
    ],
  },
  faq: {
    label: "FAQ accordion",
    fields: [{ key: "items", label: "Questions & answers", kind: "rich", max: 2000, help: "Each question is a heading; the paragraphs beneath are the answer." }],
  },
  cta: {
    label: "CTA band",
    fields: [
      { key: "title", label: "Title", kind: "text", max: 80 },
      { key: "body", label: "Body", kind: "text", max: 260 },
      { key: "ctaLabel", label: "Button label", kind: "text", max: 40 },
      { key: "ctaHref", label: "Button link", kind: "text", max: 120 },
    ],
  },
  image: {
    label: "Image",
    fields: [
      { key: "mediaId", label: "Media ID (from the Media Library)", kind: "text", max: 40 },
      { key: "caption", label: "Caption", kind: "text", max: 160 },
    ],
  },
};

declare global {
  // eslint-disable-next-line no-var
  var __vhPages: Record<string, BuiltPage> | undefined;
  // eslint-disable-next-line no-var
  var __vhMedia: MediaAsset[] | undefined;
}

function pages(): Record<string, BuiltPage> {
  globalThis.__vhPages ??= {};
  return globalThis.__vhPages;
}
function media(): MediaAsset[] {
  globalThis.__vhMedia ??= [];
  return globalThis.__vhMedia;
}

const MAX_PAGES = 12;
const MAX_BLOCKS = 16;

export async function listPages(): Promise<BuiltPage[]> {
  return Object.values(pages()).sort((a, b) => a.title.localeCompare(b.title));
}
export async function findPage(slug: string): Promise<BuiltPage | undefined> {
  return pages()[slug];
}
export async function createPage(slug: string, title: string): Promise<"limit" | "exists" | "ok"> {
  if (Object.keys(pages()).length >= MAX_PAGES) return "limit";
  if (pages()[slug]) return "exists";
  pages()[slug] = { slug, title, status: "DRAFT", blocks: [], updatedAt: new Date().toISOString().slice(0, 10) };
  return "ok";
}
export async function savePage(page: BuiltPage): Promise<void> {
  page.updatedAt = new Date().toISOString().slice(0, 10);
  pages()[page.slug] = page;
}
export async function deletePage(slug: string): Promise<void> {
  delete pages()[slug];
}

export function newBlockId(): string {
  return `b${Math.random().toString(36).slice(2, 8)}`;
}
export function canAddBlock(page: BuiltPage): boolean {
  return page.blocks.length < MAX_BLOCKS;
}

/* ── Media library ─────────────────────────────────────────────── */

export const MAX_MEDIA = 20;
export const MAX_MEDIA_BYTES = 200 * 1024; // demo cap; R2 removes it

export async function listMedia(): Promise<MediaAsset[]> {
  return media();
}
export async function findMedia(id: string): Promise<MediaAsset | undefined> {
  return media().find((m) => m.id === id);
}
export async function addMedia(asset: Omit<MediaAsset, "id" | "addedAt">): Promise<MediaAsset | "limit"> {
  if (media().length >= MAX_MEDIA) return "limit";
  const full: MediaAsset = { ...asset, id: `m${Math.random().toString(36).slice(2, 8)}`, addedAt: new Date().toISOString().slice(0, 10) };
  media().unshift(full);
  return full;
}
export async function deleteMedia(id: string): Promise<void> {
  globalThis.__vhMedia = media().filter((m) => m.id !== id);
}
