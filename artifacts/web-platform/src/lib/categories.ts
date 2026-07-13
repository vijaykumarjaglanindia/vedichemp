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
}

/** Classes a category may target. MED_CANNABIS is absent on purpose (A1). */
export const CATEGORY_CLASSES: ComplianceClass[] = ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"];

const DEFAULTS: Category[] = [
  { id: "cat-hemp", slug: "hemp-nutrition", name: "Hemp Nutrition & Food", blurb: "FSSAI-approved hemp hearts, protein and cold-pressed oil.", emoji: "🌾", cls: "HEMP_FOOD", order: 1, visible: true, custom: false },
  { id: "cat-ayur", slug: "ayurveda", name: "Ayurveda", blurb: "Classical formulations from licensed AYUSH sellers.", emoji: "🪔", cls: "AYURVEDA", order: 2, visible: true, custom: false },
  { id: "cat-cbd", slug: "cbd-wellness", name: "Hemp Wellness / CBD", blurb: "Topicals and tinctures, every batch lab-reported. 21+.", emoji: "🌿", cls: "CBD_WELLNESS", order: 3, visible: true, custom: false },
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

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}

export type CategoryResult = { ok: true; category?: Category } | { ok: false; reason: string };

export async function createCategory(input: {
  name: string; blurb: string; emoji: string; cls?: string; q?: string;
}): Promise<CategoryResult> {
  if (input.cls && !CATEGORY_CLASSES.includes(input.cls as ComplianceClass))
    return { ok: false, reason: "class" }; // A1: no medical collection, ever
  const s = store();
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
