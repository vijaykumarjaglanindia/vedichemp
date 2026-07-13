/**
 * VEDIC HEMP — SITE CONTENT (every public copy surface, editable)
 *
 * The marketplace's marketing and chrome copy is data, not code: each field
 * below has a default (the launch copy) and an admin-editable override kept
 * in a server-side store (the DB seam — swap for a `SiteContent` table).
 * Publishing is instant and visible to every visitor because all public
 * routes render dynamically.
 *
 * Storage is ALWAYS markdown-lite text (see lib/richtext.ts) — never HTML —
 * and every save passes the same claims copy-check as product copy: nothing
 * on this platform may claim to cure, treat or prevent a disease, and the
 * homepage hero is no exception.
 */

export type FieldKind = "text" | "rich";

export interface SiteField {
  key: string;
  group: string;
  label: string;
  kind: FieldKind;
  max: number;
  help?: string;
  def: string;
  /**
   * Compliance disclosures may NAME the forbidden verbs ("…never claims to
   * cure, treat or prevent…") — the copy-check is skipped for these fields
   * only. Never set this on a field that describes a product.
   */
  allowClaimVerbs?: boolean;
}

export const SITE_GROUPS = [
  "Global chrome",
  "Homepage hero",
  "Homepage sections",
  "Voices & FAQ",
  "Trust & About",
  "SEO & metadata",
] as const;

export const SITE_FIELDS: SiteField[] = [
  /* ── Global chrome ─────────────────────────────────────────────── */
  {
    key: "announcement", group: "Global chrome", label: "Announcement bar", kind: "text", max: 200,
    help: "Separate segments with a middle dot (·).",
    def: "Free shipping on orders above ₹5,000 · Products listed & shipped by licensed sellers · Cash on Delivery available",
  },
  {
    key: "footerAbout", group: "Global chrome", label: "Footer — about blurb", kind: "text", max: 260,
    def: "A regulated multi-vendor marketplace for hemp, CBD wellness, Ayurveda and medical cannabis in India.",
  },
  {
    key: "footerLegal", group: "Global chrome", label: "Footer — marketplace disclosure", kind: "rich", max: 900,
    help: "The intermediary disclosure. Commercial terms (commission rates) never appear on public pages.",
    allowClaimVerbs: true,
    def: "Vedic Hemp is a marketplace intermediary: products are listed and sold by independent sellers, who submit their licences when they create an account and who are responsible for the genuineness, quality and compliance of their listings. After you pay, your order is forwarded to the seller, who ships it and updates its status. Medical Cannabis is prescription-only and is never advertised or promoted — anywhere, to anyone. No product on this site claims to cure, treat or prevent any disease.",
  },
  {
    key: "supportEmail", group: "Global chrome", label: "Support email", kind: "text", max: 80,
    def: "support@vedichemp.com",
  },

  /* ── Homepage hero ─────────────────────────────────────────────── */
  {
    key: "heroTitle", group: "Homepage hero", label: "Hero headline", kind: "text", max: 90,
    def: "India's marketplace for hemp, Ayurveda & CBD wellness.",
  },
  {
    key: "heroSub", group: "Homepage hero", label: "Hero subheadline", kind: "text", max: 320,
    def: "Shop hemp nutrition, Ayurveda and CBD wellness listed by independent, licensed sellers. Sellers submit their licences when they join, ship every order through their delivery partner, and are responsible for the products they list.",
  },
  {
    key: "heroStats", group: "Homepage hero", label: "Hero stats strip", kind: "text", max: 140,
    help: "Separate stats with a middle dot (·).",
    def: "★ 4.6 average rating · 10,000+ products · 300+ licensed sellers",
  },
  {
    key: "heroUsps", group: "Homepage hero", label: "USP tiles", kind: "rich", max: 480,
    help: "One bullet per tile: bold title, then a pipe (|), then the support line.",
    def: "- **Free shipping above ₹5,000** | ₹100 flat below — across 19,000+ PIN codes\n- **Cash on Delivery** | Pay when it arrives\n- **Easy returns** | Buyer refunded first\n- **Fulfilled by sellers** | Packed & shipped by the seller who lists it",
  },

  /* ── Homepage sections ─────────────────────────────────────────── */
  {
    key: "flashSaleName", group: "Homepage sections", label: "Flash-sale campaign name", kind: "text", max: 60,
    def: "Monsoon Wellness Days",
  },
  {
    key: "explainerTitle", group: "Homepage sections", label: "Education explainer — title", kind: "text", max: 90,
    def: "Why hemp seed is FSSAI-approved food",
  },
  {
    key: "explainerBody", group: "Homepage sections", label: "Education explainer — body", kind: "rich", max: 900,
    def: "In 2021, FSSAI notified hemp seed, hemp seed oil and hemp seed flour as food under the Food Safety and Standards regulations. Hemp seed contains no meaningful THC — it's valued for complete plant protein and an omega 3:6 ratio close to what nutritionists recommend.\n\nThat's why hemp hearts and seed oil sit on Vedic Hemp under a standard food licence, while CBD products carry AYUSH licensing and a batch lab report.",
  },
  {
    key: "ctaSellerTitle", group: "Homepage sections", label: "Seller CTA — title", kind: "text", max: 60,
    def: "Become a seller",
  },
  {
    key: "ctaSellerBody", group: "Homepage sections", label: "Seller CTA — body", kind: "text", max: 260,
    def: "Licence checks, the CoA gate and settlement controls are built into the platform — you bring the product, we bring the compliance machinery.",
  },
  {
    key: "ctaAdvertiserTitle", group: "Homepage sections", label: "Advertiser CTA — title", kind: "text", max: 60,
    def: "Advertise with Vedic Hemp",
  },
  {
    key: "ctaAdvertiserBody", group: "Homepage sections", label: "Advertiser CTA — body", kind: "text", max: 260,
    def: "Labelled, reviewed placements across home, listings and product pages. Prescription-only (medical cannabis) products are never eligible — for anyone (A1).",
  },

  /* ── Voices & FAQ ──────────────────────────────────────────────── */
  {
    key: "homeFaqs", group: "Voices & FAQ", label: "Homepage FAQ", kind: "rich", max: 2200,
    help: "Each question is a heading; the paragraphs beneath it are the answer. Also feeds the FAQPage structured data (SEO).",
    def: "## Is hemp legal to buy in India?\n\nYes. Hemp seed products (oil, protein, hearts) are FSSAI-approved foods. CBD wellness products are sold under AYUSH licensing with a batch lab report confirming THC at or below 0.3%, and are age-gated 21+.\n\n## How do I know a product is genuinely lab-tested?\n\nEvery regulated product page shows its batch-matched Certificate of Analysis from an independent accredited lab. A regulated listing cannot go live on Vedic Hemp without an approved CoA — there is no override.\n\n## Do you sell medical cannabis?\n\nMedical cannabis exists on the platform but is prescription-only. It is never advertised, searchable or recommended. It becomes visible only to a signed-in buyer whose prescription a licensed pharmacist has verified.\n\n## Is Cash on Delivery available?\n\nYes, COD is available on most orders. Age-gated categories (CBD wellness) additionally require an ID check on handover, whatever the payment method.\n\n## Where is my personal data stored?\n\nAll personal data and payment data are held in Indian data centres (ap-south-1 / ap-south-2). Health data such as prescriptions is encrypted with a separate key and every access is logged and disclosed to you.",
  },
  {
    key: "testimonials", group: "Voices & FAQ", label: "Buyer testimonials", kind: "rich", max: 1600,
    help: "Each testimonial: a heading of \"Name · City · rating (1–5)\", then the quote beneath it.",
    def: "## Priya M. · Pune · 5\n\nThe batch CoA link printed on the invoice is what converted me. I checked the lab report against the batch number on the jar — it matched. That's a first for any Indian marketplace I've used.\n\n## Arjun T. · Bengaluru · 5\n\nOrdered hemp protein and hearts for my morning routine. Delivery in two days, clean packaging, and the seller's FSSAI licence is right there on the storefront.\n\n## Meera K. · Jaipur · 4\n\nReturned a tincture that arrived with a damaged seal — refund hit my account before the pickup was even complete. Buyer-first returns are real here.",
  },

  /* ── Trust & About ─────────────────────────────────────────────── */
  {
    key: "trustIntro", group: "Trust & About", label: "How-it-works page — intro", kind: "rich", max: 500,
    def: "Products on Vedic Hemp are listed and sold by independent sellers — not by us. Sellers submit their licences when they join, ship every order through their delivery partner, and are responsible for what they list. Here is exactly who does what.",
  },
  {
    key: "aboutIntro", group: "Trust & About", label: "About page — intro", kind: "rich", max: 500,
    def: "Vedic Hemp is a regulated multi-vendor marketplace for hemp, CBD wellness, Ayurveda and medical cannabis in India — built so that compliance is a property of the platform, not a policy someone has to remember to follow.",
  },

  /* ── SEO & metadata ────────────────────────────────────────────── */
  {
    key: "seoSiteTitle", group: "SEO & metadata", label: "Site title (default <title>)", kind: "text", max: 90,
    def: "Vedic Hemp — India's regulated hemp & wellness marketplace",
  },
  {
    key: "seoSiteDesc", group: "SEO & metadata", label: "Site meta description (default)", kind: "text", max: 220,
    help: "Search engines show ~155–160 characters.",
    def: "India's marketplace for hemp nutrition, CBD wellness and Ayurveda — products listed and shipped by independent licensed sellers.",
  },
  {
    key: "seoHomeTitle", group: "SEO & metadata", label: "Homepage <title>", kind: "text", max: 90,
    def: "Hemp, CBD wellness, Ayurveda — India's seller marketplace",
  },
  {
    key: "seoHomeDesc", group: "SEO & metadata", label: "Homepage meta description", kind: "text", max: 220,
    def: "Shop hemp food, Ayurveda and CBD wellness listed by independent licensed sellers across India. Sellers submit licences at onboarding and ship directly to you.",
  },
  {
    key: "seoCatalogueDesc", group: "SEO & metadata", label: "Catalogue meta description", kind: "text", max: 220,
    def: "Hemp nutrition, CBD wellness and Ayurveda listed by independent licensed sellers. Filter by category, price, rating and lab-report availability.",
  },
  {
    key: "seoBlogDesc", group: "SEO & metadata", label: "Journal meta description", kind: "text", max: 220,
    def: "Lab-report explainers, hemp nutrition guides and licensing explainers from Vedic Hemp. Educational only — no health claims, ever.",
  },
];

const FIELD_BY_KEY = new Map(SITE_FIELDS.map((f) => [f.key, f]));

export function siteField(key: string): SiteField | undefined {
  return FIELD_BY_KEY.get(key);
}

/* ── Server-side store (DB seam) ─────────────────────────────────── */

declare global {
  // eslint-disable-next-line no-var
  var __vhSiteContent: Record<string, string> | undefined;
}

function overrides(): Record<string, string> {
  globalThis.__vhSiteContent ??= {};
  return globalThis.__vhSiteContent;
}

export type SiteContent = Record<string, string>;

/** Every field, overrides merged over defaults. */
export async function readSiteContent(): Promise<SiteContent> {
  const o = overrides();
  const out: SiteContent = {};
  for (const f of SITE_FIELDS) out[f.key] = o[f.key] ?? f.def;
  return out;
}

/** Apply edits: a null/empty value resets the field to its default copy. */
export async function writeSiteContent(patch: Record<string, string | null>): Promise<void> {
  const o = overrides();
  for (const [key, value] of Object.entries(patch)) {
    if (!FIELD_BY_KEY.has(key)) continue;
    if (value === null || !value.trim()) delete o[key];
    else o[key] = value;
  }
}

/* ── Parsers for structured rich fields ──────────────────────────── */

const NORM = (md: string) => md.replace(/\r\n?/g, "\n");

/** "## Heading" blocks: heading + the paragraphs beneath it, until the next heading. */
export function parseHeadedBlocks(md: string): { head: string; body: string }[] {
  const out: { head: string; body: string }[] = [];
  for (const block of NORM(md).split(/\n{2,}/)) {
    const b = block.trim();
    if (!b) continue;
    if (b.startsWith("## ")) out.push({ head: b.slice(3).trim(), body: "" });
    else if (out.length > 0) {
      const last = out[out.length - 1];
      if (last) last.body = last.body ? `${last.body}\n\n${b}` : b;
    }
  }
  return out.filter((x) => x.head && x.body);
}

export function parseFaqs(md: string): { q: string; a: string }[] {
  return parseHeadedBlocks(md).map(({ head, body }) => ({ q: head, a: body }));
}

/** Testimonial heading format: "Name · City · rating". */
export function parseTestimonials(md: string): { name: string; city: string; rating: number; text: string }[] {
  return parseHeadedBlocks(md).map(({ head, body }) => {
    const [name = "", city = "", ratingRaw = "5"] = head.split("·").map((s) => s.trim());
    const rating = Math.min(5, Math.max(1, parseInt(ratingRaw, 10) || 5));
    return { name, city, rating, text: body };
  });
}

/** USP list lines: "- **Title** | support line". */
export function parseTiles(md: string): { title: string; sub: string }[] {
  return NORM(md)
    .split("\n")
    .map((l) => l.trim().replace(/^-\s+/, ""))
    .filter(Boolean)
    .map((l) => {
      const [titleRaw = "", sub = ""] = l.split("|").map((s) => s.trim());
      return { title: titleRaw.replace(/\*\*/g, ""), sub };
    })
    .filter((t) => t.title);
}
