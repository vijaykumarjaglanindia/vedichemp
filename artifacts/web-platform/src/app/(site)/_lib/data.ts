/**
 * VEDIC HEMP — PUBLIC SITE LOCAL DATA (presentation only)
 *
 * Richer illustrative content for the marketing surfaces: deals, testimonials,
 * FAQs, education cards, health goals, seller storefront profiles and PDP
 * specifications. Everything here is derived from — or consistent with — the
 * shared sample data, and every product-bearing export is built through the
 * permitted-class filter so MED_CANNABIS is structurally absent from every
 * shoppable collection (A1), even if the upstream sample set ever changes.
 *
 * Copy rule: wellness text describes composition and traditional use only.
 * No disease cure/treatment/prevention claims (Drugs & Magic Remedies Act).
 */

import type { LucideIcon } from "lucide-react";
import { Brain, Dumbbell, Moon, Soup, Sparkles, Wheat } from "lucide-react";
import { liveByClasses } from "@/lib/catalog";
import { permittedClasses } from "@/lib/compliance";
import { SELLERS, type SampleProduct, type SampleSeller } from "@/lib/sample";

/* ── Public product universe (A1: permitted classes only) ──────── */

/**
 * Every public collection starts here — the LIVE catalogue store filtered to
 * permitted classes, so MED_CANNABIS cannot enter and an archived or
 * suspended listing is structurally absent from every shoppable strip.
 */
export async function publicProducts(): Promise<SampleProduct[]> {
  return liveByClasses(permittedClasses({ hasRx: false }));
}

export function discountPct(p: SampleProduct): number {
  if (p.mrpPaise <= p.pricePaise) return 0;
  return Math.round(((p.mrpPaise - p.pricePaise) / p.mrpPaise) * 100);
}

/** Today's deals: permitted LIVE products, deepest discount first. */
export async function deals(): Promise<SampleProduct[]> {
  return [...(await publicProducts())]
    .filter((p) => discountPct(p) > 0)
    .sort((a, b) => discountPct(b) - discountPct(a));
}

/** Flash-sale line-up (campaign: Monsoon Wellness Days). */
export async function flashSale(): Promise<SampleProduct[]> {
  return (await deals()).slice(0, 4);
}

/** "Recently viewed" strip — illustrative; a real one is session-derived server-side. */
export async function recentlyViewed(): Promise<SampleProduct[]> {
  return (await publicProducts()).filter((p) =>
    ["hemp-seed-oil-250ml", "ashwagandha-60", "cbd-rollon-50ml", "hemp-hearts-400g"].includes(p.slug),
  );
}

/* ── Health goals (composition / traditional-use copy only) ────── */

export interface HealthGoal {
  icon: LucideIcon;
  title: string;
  blurb: string;
  href: string;
}

/* ── Hemp education ─────────────────────────────────────────────── */

export interface EducationCard {
  emoji: string;
  title: string;
  minutes: number;
  teaser: string;
  href: string;
}

/* ── Testimonials ───────────────────────────────────────────────── */

export interface Testimonial {
  name: string;
  city: string;
  rating: number;
  text: string;
}

/* ── Homepage FAQ ───────────────────────────────────────────────── */

/* ── Industry stats band ────────────────────────────────────────── */

/* ── Seller storefronts ─────────────────────────────────────────── */

export function sellerSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function sellerBySlug(slug: string): SampleSeller | undefined {
  return SELLERS.find((s) => sellerSlug(s.name) === slug);
}

/** Products for a seller — always drawn from the public (permitted, LIVE) universe. */
export async function sellerProducts(sellerName: string): Promise<SampleProduct[]> {
  return (await publicProducts()).filter((p) => p.seller === sellerName);
}

export interface StoreProfile {
  tagline: string;
  story: string;
  founded: string;
  location: string;
  certifications: string[];
  collections: string[];
}

export const STORE_PROFILES: Record<string, StoreProfile> = {
  "vedic-botanicals": {
    tagline: "AYUSH-licensed CBD wellness, batch-tested since 2021",
    story:
      "Vedic Botanicals formulates CBD balms, tinctures and roll-ons in a GMP-certified facility in Pune. Every batch is sent to an independent accredited lab before it is listed — the CoA you see on a product page is for the exact batch that ships to you.",
    founded: "2021",
    location: "Pune, Maharashtra",
    certifications: ["AYUSH manufacturing licence", "GMP-certified facility", "Batch CoA on every product", "ISO 9001:2015"],
    collections: ["Topical balms", "Tinctures", "Roll-ons", "Gift sets"],
  },
  "himalayan-hemp-co": {
    tagline: "Cold-pressed hemp nutrition from Uttarakhand farms",
    story:
      "Himalayan Hemp Co. works with smallholder farmers in Uttarakhand to grow food-grade hemp under FSSAI licensing. Seeds are cold-pressed within 48 hours of cleaning to keep the omega profile intact.",
    founded: "2019",
    location: "Dehradun, Uttarakhand",
    certifications: ["FSSAI food business licence", "Farm-traceable sourcing", "Cold-pressed within 48h"],
    collections: ["Seed oils", "Protein powders", "Pantry staples"],
  },
  "ananda-foods": {
    tagline: "Classical Ayurveda and everyday hemp foods",
    story:
      "Ananda Foods pairs classical Ayurvedic formulations — churnas and extracts made to traditional texts — with everyday hemp foods. AYUSH and FSSAI licensed, with full ingredient disclosure on every label.",
    founded: "2017",
    location: "Mysuru, Karnataka",
    certifications: ["AYUSH licence", "FSSAI food business licence", "Full ingredient disclosure"],
    collections: ["Churnas", "Extracts", "Hemp pantry"],
  },
};

/* ── PDP enrichment ─────────────────────────────────────────────── */

export interface ProductSpecs {
  netWeight: string;
  ingredients: string;
  hsn: string;
  batch: string;
  lab: string;
  marketer?: string;
  countryOfOrigin?: string;
  shelfLife?: string;
  storage?: string;
  directions?: string;
  fssai?: string;
}

/** The live-product fields specsFor reads. A seeded SampleProduct has none of
 *  them; a seller-created CatalogProduct fills them from the listing form. */
type SpecSource = SampleProduct & Partial<{
  hsn: string; batchCode: string; netQuantity: string; ingredients: string;
  marketer: string; countryOfOrigin: string; shelfLifeMonths: number;
  storage: string; directions: string; fssaiLicNo: string;
}>;

const SPECS: Record<string, ProductSpecs> = {
  "hemp-seed-oil-250ml": { netWeight: "250 ml", ingredients: "100% cold-pressed hemp seed oil (Cannabis sativa L. seed)", hsn: "1515", batch: "HH-2506", lab: "FSSAI-licensed facility (food class — no batch CoA gate)" },
  "hemp-protein-500g": { netWeight: "500 g", ingredients: "Hemp seed protein powder (50% protein)", hsn: "1208", batch: "HH-2504", lab: "FSSAI-licensed facility (food class — no batch CoA gate)" },
  "hemp-hearts-400g": { netWeight: "400 g", ingredients: "Hulled hemp seeds (hemp hearts)", hsn: "1207", batch: "AF-2507", lab: "FSSAI-licensed facility (food class — no batch CoA gate)" },
  "cbd-balm-30g": { netWeight: "30 g", ingredients: "Full-spectrum hemp extract, shea butter, beeswax, camphor", hsn: "3004", batch: "VB-2406", lab: "Aurum Analytica, Bengaluru (NABL-accredited)" },
  "cbd-tincture-10ml": { netWeight: "10 ml", ingredients: "Hemp leaf extract in MCT oil, 1500 mg CBD", hsn: "3004", batch: "VB-2409", lab: "Aurum Analytica, Bengaluru (NABL-accredited)" },
  "ashwagandha-60": { netWeight: "60 capsules", ingredients: "Withania somnifera root extract 500 mg per capsule", hsn: "3004", batch: "AF-2503", lab: "AYUSH-licensed facility" },
  "triphala-200g": { netWeight: "200 g", ingredients: "Amalaki, Bibhitaki, Haritaki (equal parts, classical ratio)", hsn: "3004", batch: "AF-2501", lab: "AYUSH-licensed facility" },
  "cbd-rollon-50ml": { netWeight: "50 ml", ingredients: "Hemp extract, menthol, wintergreen oil in roll-on base", hsn: "3004", batch: "VB-2411", lab: "Aurum Analytica, Bengaluru (NABL-accredited)" },
};

const DASH = "—";

/**
 * The PDP spec table. A seller-created listing supplies its own label facts;
 * they win. The seeded sample catalogue has no such fields, so it falls back
 * to the curated SPECS map, then to safe generic defaults — every listing
 * renders a complete, honest table either way.
 */
export function specsFor(p: SpecSource): ProductSpecs {
  const seed = SPECS[p.slug];
  return {
    netWeight: p.netQuantity || seed?.netWeight || DASH,
    ingredients: p.ingredients || seed?.ingredients || "See pack label",
    hsn: p.hsn || seed?.hsn || DASH,
    // The curated batch for a seeded product is its QR-printed/public batch (the
    // one the /verify page and PDP surface). A seller-CREATED listing has no
    // curated entry, so it falls through to its own catalog batchCode.
    batch: seed?.batch || p.batchCode || DASH,
    lab: seed?.lab || (p.labVerified ? "NABL-accredited independent lab" : "Licensed facility"),
    marketer: p.marketer || seed?.marketer,
    countryOfOrigin: p.countryOfOrigin || seed?.countryOfOrigin || "India",
    shelfLife: (p.shelfLifeMonths && p.shelfLifeMonths > 0 ? `${p.shelfLifeMonths} months from manufacture` : undefined) || seed?.shelfLife,
    storage: p.storage || seed?.storage,
    directions: p.directions || seed?.directions,
    fssai: p.fssaiLicNo || seed?.fssai,
  };
}

export const PDP_QA: { q: string; a: string }[] = [
  { q: "Is the lab report for this exact batch?", a: "Yes. The CoA shown is matched to the batch number printed on the pack — a listing cannot go live with a mismatched or expired report." },
  { q: "Can I return this if the seal is broken on arrival?", a: "Yes. Report it within 48 hours of delivery — the refund is issued to you first, and the platform recovers from the seller afterwards." },
  { q: "Does this product make any medical claims?", a: "No. Under the Drugs & Magic Remedies Act, no product on Vedic Hemp may claim to cure, treat or prevent a disease. Copy describes composition and traditional use only." },
];

/** "Frequently bought together": up to `n` other permitted products, same class first. */
export async function frequentlyBoughtWith(p: SampleProduct, n = 2): Promise<SampleProduct[]> {
  const all = await publicProducts();
  const sameClass = all.filter((x) => x.id !== p.id && x.cls === p.cls);
  const others = all.filter((x) => x.id !== p.id && x.cls !== p.cls);
  return [...sameClass, ...others].slice(0, n);
}

/** "Similar products": same class, else the rest of the permitted universe. */
export async function similarProducts(p: SampleProduct, n = 6): Promise<SampleProduct[]> {
  return frequentlyBoughtWith(p, n);
}
