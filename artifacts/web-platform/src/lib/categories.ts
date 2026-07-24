/**
 * VEDIC HEMP — MERCHANDISING CATEGORIES (admin-managed, full CRUD)
 *
 * Categories are EDITORIAL: names, blurbs, ordering and visibility belong to
 * the admin. Compliance class is NOT editorial — a category can point at a
 * class as its filter, but moving products between categories never changes
 * anyone's compliance class, and no category may target MED_CANNABIS (A1: a
 * public collection page IS promotion). Server-side store = the DB seam.
 *
 * A category filters the catalogue two ways, composable:
 *   cls — restrict to one compliance class
 *   q   — a search phrase applied with the same synonym/typo matcher as search
 */

import { ComplianceClass } from "@prisma/client";

export interface Category {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  emoji: string;
  cls?: ComplianceClass;
  q?: string;
  order: number;
  visible: boolean;
  custom: boolean; // launch categories can be edited/hidden but not deleted
  parentId?: string; // set = this is a sub-category of another (one level of nesting)
}

/** A category with its sub-categories attached (for tree navigation). */
export interface CategoryNode extends Category {
  children: Category[];
}

/** Classes a category may target. MED_CANNABIS is absent on purpose (A1). */
export const CATEGORY_CLASSES: ComplianceClass[] = ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"];

const DEFAULTS: Category[] = [
  // ── Top-level departments (one per shoppable class; MED_CANNABIS is never a department — A1) ──
  { id: "cat-hemp", slug: "hemp-nutrition", name: "Hemp Nutrition & Food", blurb: "FSSAI-approved hemp hearts, protein and cold-pressed oil.", emoji: "🌾", cls: "HEMP_FOOD", order: 1, visible: true, custom: false },
  { id: "cat-ayur", slug: "ayurveda", name: "Ayurveda", blurb: "Classical formulations from licensed AYUSH sellers.", emoji: "🪔", cls: "AYURVEDA", order: 2, visible: true, custom: false },
  { id: "cat-cbd", slug: "cbd-wellness", name: "Hemp Wellness / CBD", blurb: "Topicals and tinctures, every batch lab-reported. 21+.", emoji: "🌿", cls: "CBD_WELLNESS", order: 3, visible: true, custom: false },

  // ── Sub-categories · Hemp Nutrition & Food ──
  { id: "cat-hemp-hearts", slug: "hemp-seeds-hearts", name: "Hemp Seeds & Hearts", blurb: "Raw and hulled hemp hearts and seeds.", emoji: "🌰", cls: "HEMP_FOOD", q: "hemp hearts seeds", order: 10, visible: true, custom: false, parentId: "cat-hemp" },
  { id: "cat-hemp-protein", slug: "hemp-protein", name: "Hemp Protein", blurb: "Plant protein powders and blends.", emoji: "💪", cls: "HEMP_FOOD", q: "protein", order: 11, visible: true, custom: false, parentId: "cat-hemp" },
  { id: "cat-hemp-oil", slug: "hemp-culinary-oil", name: "Cold-Pressed Hemp Oil", blurb: "Culinary hemp seed oil.", emoji: "🫒", cls: "HEMP_FOOD", q: "hemp oil", order: 12, visible: true, custom: false, parentId: "cat-hemp" },
  { id: "cat-hemp-flour", slug: "hemp-flour-foods", name: "Hemp Flour & Foods", blurb: "Flour, bars and everyday hemp foods.", emoji: "🥣", cls: "HEMP_FOOD", q: "flour", order: 13, visible: true, custom: false, parentId: "cat-hemp" },

  // ── Sub-categories · Ayurveda ──
  { id: "cat-ayur-churna", slug: "churna-powders", name: "Churna & Powders", blurb: "Classical churnas and herbal powders.", emoji: "🌿", cls: "AYURVEDA", q: "churna powder", order: 20, visible: true, custom: false, parentId: "cat-ayur" },
  { id: "cat-ayur-tabs", slug: "ayurvedic-tablets", name: "Tablets & Capsules", blurb: "Vati, tablets and herbal capsules.", emoji: "💊", cls: "AYURVEDA", q: "tablet capsule", order: 21, visible: true, custom: false, parentId: "cat-ayur" },
  { id: "cat-ayur-oils", slug: "herbal-oils", name: "Herbal Oils", blurb: "Ayurvedic oils for massage and care.", emoji: "🪔", cls: "AYURVEDA", q: "oil", order: 22, visible: true, custom: false, parentId: "cat-ayur" },
  { id: "cat-ayur-ashwa", slug: "ashwagandha", name: "Ashwagandha", blurb: "Ashwagandha in every form.", emoji: "🌱", cls: "AYURVEDA", q: "ashwagandha", order: 23, visible: true, custom: false, parentId: "cat-ayur" },
  { id: "cat-ayur-immunity", slug: "immunity-wellness", name: "Immunity & Wellness", blurb: "Everyday immunity and wellness support.", emoji: "🛡️", cls: "AYURVEDA", q: "immunity", order: 24, visible: true, custom: false, parentId: "cat-ayur" },

  // ── Sub-categories · Hemp Wellness / CBD ──
  { id: "cat-cbd-tinctures", slug: "cbd-tinctures-oils", name: "Tinctures & Oils", blurb: "Lab-reported tinctures and oils. 21+.", emoji: "💧", cls: "CBD_WELLNESS", q: "tincture oil", order: 30, visible: true, custom: false, parentId: "cat-cbd" },
  { id: "cat-cbd-balms", slug: "cbd-balms-topicals", name: "Balms & Topicals", blurb: "Balms, salves and topical care. 21+.", emoji: "🧴", cls: "CBD_WELLNESS", q: "balm topical", order: 31, visible: true, custom: false, parentId: "cat-cbd" },
  { id: "cat-cbd-capsules", slug: "cbd-capsules", name: "Capsules & Softgels", blurb: "Pre-measured capsules and softgels. 21+.", emoji: "💊", cls: "CBD_WELLNESS", q: "capsule", order: 32, visible: true, custom: false, parentId: "cat-cbd" },
  { id: "cat-cbd-skin", slug: "cbd-skincare", name: "Skincare", blurb: "Hemp-based skincare. 21+.", emoji: "✨", cls: "CBD_WELLNESS", q: "skin", order: 33, visible: true, custom: false, parentId: "cat-cbd" },
  { id: "cat-cbd-pet", slug: "cbd-pet-wellness", name: "Pet Wellness", blurb: "Hemp wellness for pets.", emoji: "🐾", cls: "CBD_WELLNESS", q: "pet", order: 34, visible: true, custom: false, parentId: "cat-cbd" },
];

interface CategoryStore {
  created: Category[];
  patches: Record<string, Partial<Category>>;
  deleted: string[];
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhCategories: CategoryStore | undefined;
}

function store(): CategoryStore {
  globalThis.__vhCategories ??= { created: [], patches: {}, deleted: [], seq: 1 };
  return globalThis.__vhCategories;
}

export async function readCategories(opts?: { includeHidden?: boolean }): Promise<Category[]> {
  const s = store();
  return [...DEFAULTS, ...s.created]
    .filter((c) => !s.deleted.includes(c.id))
    .map((c) => ({ ...c, ...s.patches[c.id] }))
    .filter((c) => (opts?.includeHidden ? true : c.visible))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export async function findCategory(slug: string): Promise<Category | null> {
  return (await readCategories({ includeHidden: true })).find((c) => c.slug === slug) ?? null;
}

export async function findCategoryById(id: string): Promise<Category | null> {
  return (await readCategories({ includeHidden: true })).find((c) => c.id === id) ?? null;
}

/** Top-level categories, each with its visible sub-categories nested (one level). */
export async function categoryTree(opts?: { includeHidden?: boolean }): Promise<CategoryNode[]> {
  const all = await readCategories(opts);
  const tops = all.filter((c) => !c.parentId);
  return tops.map((c) => ({ ...c, children: all.filter((k) => k.parentId === c.id) }));
}

/** The sub-categories of one parent. */
export async function subCategories(parentId: string, opts?: { includeHidden?: boolean }): Promise<Category[]> {
  return (await readCategories(opts)).filter((c) => c.parentId === parentId);
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}

export type CategoryResult = { ok: true; category?: Category } | { ok: false; reason: string };

export async function createCategory(input: {
  name: string; blurb: string; emoji: string; cls?: string; q?: string; parentId?: string;
}): Promise<CategoryResult> {
  if (input.cls && !CATEGORY_CLASSES.includes(input.cls as ComplianceClass))
    return { ok: false, reason: "class" }; // A1: no medical collection, ever
  const s = store();
  // A sub-category must point at a real, top-level parent (one level of nesting).
  if (input.parentId) {
    const parent = await findCategoryById(input.parentId);
    if (!parent) return { ok: false, reason: "parent" };
    if (parent.parentId) return { ok: false, reason: "nesting" };
  }
  let slug = slugify(input.name) || `collection-${s.seq}`;
  if (await findCategory(slug)) slug = `${slug}-${s.seq}`;
  const all = await readCategories({ includeHidden: true });
  const category: Category = {
    id: `cat-x${s.seq++}`,
    slug,
    name: input.name,
    blurb: input.blurb,
    emoji: input.emoji || "🌿",
    ...(input.cls ? { cls: input.cls as ComplianceClass } : {}),
    ...(input.q ? { q: input.q } : {}),
    ...(input.parentId ? { parentId: input.parentId } : {}),
    order: (all[all.length - 1]?.order ?? 0) + 1,
    visible: true,
    custom: true,
  };
  s.created.push(category);
  return { ok: true, category };
}

export async function updateCategory(
  id: string,
  patch: Partial<Pick<Category, "name" | "blurb" | "emoji" | "q" | "order" | "visible">> & { cls?: string },
): Promise<CategoryResult> {
  const s = store();
  const exists = [...DEFAULTS, ...s.created].some((c) => c.id === id && !s.deleted.includes(c.id));
  if (!exists) return { ok: false, reason: "missing" };
  if (patch.cls !== undefined && patch.cls !== "" && !CATEGORY_CLASSES.includes(patch.cls as ComplianceClass))
    return { ok: false, reason: "class" };
  const { cls, ...rest } = patch;
  s.patches[id] = {
    ...s.patches[id],
    ...rest,
    ...(cls !== undefined ? { cls: cls === "" ? undefined : (cls as ComplianceClass) } : {}),
  };
  return { ok: true };
}

/** Launch categories can be hidden, not deleted — links to them may be printed. */
export async function deleteCategory(id: string): Promise<CategoryResult> {
  const s = store();
  const cat = [...DEFAULTS, ...s.created]
    .filter((c) => !s.deleted.includes(c.id))
    .map((c) => ({ ...c, ...s.patches[c.id] }))
    .find((c) => c.id === id);
  if (!cat) return { ok: false, reason: "missing" };
  if (!cat.custom) return { ok: false, reason: "fixture" };
  s.deleted.push(id);
  return { ok: true };
}
