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
import { permittedClasses } from "@/lib/compliance";
import { classProducts, SELLERS, type SampleProduct, type SampleSeller } from "@/lib/sample";

/* ── Public product universe (A1: permitted classes only) ──────── */

/** Every public collection starts here — MED_CANNABIS cannot enter. */
export const PUBLIC_PRODUCTS: SampleProduct[] = classProducts(permittedClasses({ hasRx: false }));

export function discountPct(p: SampleProduct): number {
  if (p.mrpPaise <= p.pricePaise) return 0;
  return Math.round(((p.mrpPaise - p.pricePaise) / p.mrpPaise) * 100);
}

/** Today's deals: permitted products, deepest discount first. */
export const DEALS: SampleProduct[] = [...PUBLIC_PRODUCTS]
  .filter((p) => discountPct(p) > 0)
  .sort((a, b) => discountPct(b) - discountPct(a));

/** Flash-sale line-up (campaign: Monsoon Wellness Days). */
export const FLASH_SALE: SampleProduct[] = DEALS.slice(0, 4);

/** "Recently viewed" strip — illustrative; a real one is session-derived server-side. */
export const RECENTLY_VIEWED: SampleProduct[] = PUBLIC_PRODUCTS.filter((p) =>
  ["hemp-seed-oil-250ml", "ashwagandha-60", "cbd-rollon-50ml", "hemp-hearts-400g"].includes(p.slug),
);

/* ── Health goals (composition / traditional-use copy only) ────── */

export interface HealthGoal {
  icon: LucideIcon;
  title: string;
  blurb: string;
  href: string;
}

export const HEALTH_GOALS: HealthGoal[] = [
  { icon: Moon, title: "Sleep & calm", blurb: "Evening rituals built on Ashwagandha and traditional calming herbs.", href: "/catalogue?class=AYURVEDA" },
  { icon: Wheat, title: "Daily nutrition", blurb: "Hemp hearts and protein — complete plant protein with omega 3 & 6.", href: "/catalogue?class=HEMP_FOOD" },
  { icon: Dumbbell, title: "Muscle recovery", blurb: "Topical CBD balms and roll-ons used in post-workout massage routines.", href: "/catalogue?class=CBD_WELLNESS" },
  { icon: Sparkles, title: "Skin & body", blurb: "Cold-pressed hemp seed oil, traditionally used in skin and hair care.", href: "/catalogue?class=HEMP_FOOD" },
  { icon: Soup, title: "Digestive care", blurb: "Triphala and classical churnas from the Ayurvedic tradition.", href: "/catalogue?class=AYURVEDA" },
  { icon: Brain, title: "Focus", blurb: "Adaptogen formulations used in daily study and work routines.", href: "/catalogue?class=AYURVEDA" },
];

/* ── Hemp education ─────────────────────────────────────────────── */

export interface EducationCard {
  emoji: string;
  title: string;
  minutes: number;
  teaser: string;
  href: string;
}

export const EDUCATION_ARTICLES: EducationCard[] = [
  {
    emoji: "🌾",
    title: "Hemp vs. marijuana: what Indian law actually says",
    minutes: 4,
    teaser: "Hemp is cannabis bred for fibre and seed with THC at or below 0.3% — and Indian regulation treats the two very differently.",
    href: "/trust",
  },
  {
    emoji: "🧪",
    title: "How to read a Certificate of Analysis",
    minutes: 5,
    teaser: "Batch number, cannabinoid profile, contaminant panel, issuing lab — the four things to check before you buy any CBD product.",
    href: "/trust#coa",
  },
  {
    emoji: "🥗",
    title: "Cooking with hemp hearts, oil and protein",
    minutes: 3,
    teaser: "Hemp seed is a food, not a supplement: how to fold hearts, oil and protein into everyday Indian meals.",
    href: "/catalogue?class=HEMP_FOOD",
  },
];

/* ── Testimonials ───────────────────────────────────────────────── */

export interface Testimonial {
  name: string;
  city: string;
  rating: number;
  text: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Priya M.",
    city: "Pune",
    rating: 5,
    text: "The batch CoA link printed on the invoice is what converted me. I checked the lab report against the batch number on the jar — it matched. That's a first for any Indian marketplace I've used.",
  },
  {
    name: "Arjun T.",
    city: "Bengaluru",
    rating: 5,
    text: "Ordered hemp protein and hearts for my morning routine. Delivery in two days, clean packaging, and the seller's FSSAI licence is right there on the storefront.",
  },
  {
    name: "Meera K.",
    city: "Jaipur",
    rating: 4,
    text: "Returned a tincture that arrived with a damaged seal — refund hit my account before the pickup was even complete. Buyer-first returns are real here.",
  },
];

/* ── Homepage FAQ ───────────────────────────────────────────────── */

export const HOME_FAQS: { q: string; a: string }[] = [
  {
    q: "Is hemp legal to buy in India?",
    a: "Yes. Hemp seed products (oil, protein, hearts) are FSSAI-approved foods. CBD wellness products are sold under AYUSH licensing with a batch lab report confirming THC at or below 0.3%, and are age-gated 18+.",
  },
  {
    q: "How do I know a product is genuinely lab-tested?",
    a: "Every regulated product page shows its batch-matched Certificate of Analysis from an independent accredited lab. A regulated listing cannot go live on Vedic Hemp without an approved CoA — there is no override.",
  },
  {
    q: "Do you sell medical cannabis?",
    a: "Medical cannabis exists on the platform but is prescription-only. It is never advertised, searchable or recommended. It becomes visible only to a signed-in buyer whose prescription a licensed pharmacist has verified.",
  },
  {
    q: "Is Cash on Delivery available?",
    a: "Yes, COD is available on most orders. Age-gated categories (CBD wellness) additionally require an ID check on handover, whatever the payment method.",
  },
  {
    q: "Where is my personal data stored?",
    a: "All personal data and payment data are held in Indian data centres (ap-south-1 / ap-south-2). Health data such as prescriptions is encrypted with a separate key and every access is logged and disclosed to you.",
  },
];

/* ── Industry stats band ────────────────────────────────────────── */

export const INDUSTRY_STATS: { value: string; label: string; sub: string }[] = [
  { value: "10,000+", label: "Products listed by sellers", sub: "Across hemp food, Ayurveda and CBD wellness" },
  { value: "300+", label: "Independent sellers", sub: "Licences submitted at account creation" },
  { value: "4.6 ★", label: "Average product rating", sub: "From verified purchases only" },
  { value: "28", label: "States & UTs served", sub: "Shipped directly by sellers" },
];

/* ── Seller storefronts ─────────────────────────────────────────── */

export function sellerSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function sellerBySlug(slug: string): SampleSeller | undefined {
  return SELLERS.find((s) => sellerSlug(s.name) === slug);
}

/** Products for a seller — always drawn from the public (permitted) universe. */
export function sellerProducts(sellerName: string): SampleProduct[] {
  return PUBLIC_PRODUCTS.filter((p) => p.seller === sellerName);
}

export interface StoreProfile {
  tagline: string;
  story: string;
  founded: string;
  location: string;
  certifications: string[];
  collections: string[];
  followerCount: number;
  reviewCount: number;
  rating: number;
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
    followerCount: 12840,
    reviewCount: 3160,
    rating: 4.4,
  },
  "himalayan-hemp-co": {
    tagline: "Cold-pressed hemp nutrition from Uttarakhand farms",
    story:
      "Himalayan Hemp Co. works with smallholder farmers in Uttarakhand to grow food-grade hemp under FSSAI licensing. Seeds are cold-pressed within 48 hours of cleaning to keep the omega profile intact.",
    founded: "2019",
    location: "Dehradun, Uttarakhand",
    certifications: ["FSSAI food business licence", "Farm-traceable sourcing", "Cold-pressed within 48h"],
    collections: ["Seed oils", "Protein powders", "Pantry staples"],
    followerCount: 9210,
    reviewCount: 2470,
    rating: 4.5,
  },
  "ananda-foods": {
    tagline: "Classical Ayurveda and everyday hemp foods",
    story:
      "Ananda Foods pairs classical Ayurvedic formulations — churnas and extracts made to traditional texts — with everyday hemp foods. AYUSH and FSSAI licensed, with full ingredient disclosure on every label.",
    founded: "2017",
    location: "Mysuru, Karnataka",
    certifications: ["AYUSH licence", "FSSAI food business licence", "Full ingredient disclosure"],
    collections: ["Churnas", "Extracts", "Hemp pantry"],
    followerCount: 6875,
    reviewCount: 1980,
    rating: 4.6,
  },
};

/* ── PDP enrichment ─────────────────────────────────────────────── */

export interface ProductSpecs {
  netWeight: string;
  ingredients: string;
  hsn: string;
  batch: string;
  lab: string;
}

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

export function specsFor(p: SampleProduct): ProductSpecs {
  return (
    SPECS[p.slug] ?? {
      netWeight: "—",
      ingredients: "See pack label",
      hsn: "—",
      batch: "—",
      lab: p.labVerified ? "NABL-accredited independent lab" : "Licensed facility",
    }
  );
}

export const PDP_QA: { q: string; a: string }[] = [
  { q: "Is the lab report for this exact batch?", a: "Yes. The CoA shown is matched to the batch number printed on the pack — a listing cannot go live with a mismatched or expired report." },
  { q: "Can I return this if the seal is broken on arrival?", a: "Yes. Report it within 48 hours of delivery — the refund is issued to you first, and the platform recovers from the seller afterwards." },
  { q: "Does this product make any medical claims?", a: "No. Under the Drugs & Magic Remedies Act, no product on Vedic Hemp may claim to cure, treat or prevent a disease. Copy describes composition and traditional use only." },
];

/** "Frequently bought together": up to `n` other permitted products, same class first. */
export function frequentlyBoughtWith(p: SampleProduct, n = 2): SampleProduct[] {
  const sameClass = PUBLIC_PRODUCTS.filter((x) => x.id !== p.id && x.cls === p.cls);
  const others = PUBLIC_PRODUCTS.filter((x) => x.id !== p.id && x.cls !== p.cls);
  return [...sameClass, ...others].slice(0, n);
}

/** "Similar products": same class, else the rest of the permitted universe. */
export function similarProducts(p: SampleProduct, n = 6): SampleProduct[] {
  return frequentlyBoughtWith(p, n);
}
