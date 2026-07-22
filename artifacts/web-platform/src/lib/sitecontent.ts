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
  "Menus",
  "Homepage hero",
  "Homepage headings",
  "Homepage sections",
  "Voices & FAQ",
  "Trust & About",
  "Legal & policies",
  "SEO & metadata",
] as const;

export const SITE_FIELDS: SiteField[] = [
  /* ── Global chrome ─────────────────────────────────────────────── */
  {
    key: "siteName", group: "Global chrome", label: "Site name (brand)", kind: "text", max: 40,
    def: "Vedic Hemp",
  },
  {
    key: "announcement", group: "Global chrome", label: "Announcement bar", kind: "text", max: 200,
    help: "Separate segments with a middle dot (·).",
    def: "Free shipping on orders above ₹5,000 · Products listed & shipped by licensed sellers · Secure online payment",
  },
  {
    key: "footerAbout", group: "Global chrome", label: "Footer — about blurb", kind: "text", max: 260,
    def: "An online marketplace where trusted, licensed sellers offer hemp, CBD wellness, Ayurveda and medical cannabis across India.",
  },
  {
    key: "footerLegal", group: "Global chrome", label: "Footer — marketplace disclosure", kind: "rich", max: 900,
    help: "The intermediary disclosure. Commercial terms (commission rates) never appear on public pages.",
    allowClaimVerbs: true,
    def: "Products on Vedic Hemp are listed and sold by independent, licensed sellers — after you pay, your seller packs and ships your order. No product on this site claims to cure, treat or prevent any disease. Full details are in our Terms of Service.",
  },
  {
    key: "supportEmail", group: "Global chrome", label: "Support email", kind: "text", max: 80,
    def: "support@vedichemp.com",
  },

  /* ── Menus (WordPress-style: one link per line, "Label | /path") ── */
  {
    key: "navHeader", group: "Menus", label: "Header navigation", kind: "rich", max: 400,
    help: "One link per line: Label | /path. The Shop mega-panel stays automatic.",
    def: "- All products | /catalogue\n- How it works | /trust\n- Help | /help\n- About | /about",
  },
  {
    key: "footerShop", group: "Menus", label: "Footer — Shop column", kind: "rich", max: 500,
    def: "- All products | /catalogue\n- Hemp Nutrition & Food | /catalogue?class=HEMP_FOOD\n- Ayurveda | /catalogue?class=AYURVEDA\n- Hemp Wellness / CBD | /catalogue?class=CBD_WELLNESS\n- AI Gift Finder | /gifts\n- Verify a batch | /verify",
  },
  {
    key: "footerTrust", group: "Menus", label: "Footer — Trust column", kind: "rich", max: 500,
    def: "- How it works | /trust\n- Lab test reports | /trust#coa\n- How prescriptions work | /trust#prescriptions\n- Our six prohibitions | /trust#prohibitions",
  },
  {
    key: "footerCompany", group: "Menus", label: "Footer — Company column", kind: "rich", max: 500,
    def: "- Help Centre | /help\n- About Vedic Hemp | /about\n- Wellness journal | /blog\n- My account | /account\n- Verified stores | /stores",
  },
  {
    key: "footerPolicies", group: "Menus", label: "Footer — Policies column", kind: "rich", max: 500,
    def: "- Terms of Service | /legal/terms\n- Privacy Policy | /legal/privacy\n- Returns & Refunds | /legal/returns\n- Shipping Policy | /legal/shipping",
  },
  {
    key: "footerPartners", group: "Menus", label: "Footer — Partners column", kind: "rich", max: 500,
    def: "- Sell on Vedic Hemp | /sell\n- Commission & fees | /sell#commission\n- Advertise with us | /sell#advertise",
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
    def: "Lab-tested every batch · Licensed sellers only · Buyer-first returns",
  },
  {
    key: "heroUsps", group: "Homepage hero", label: "USP tiles", kind: "rich", max: 480,
    help: "One bullet per tile: bold title, then a pipe (|), then the support line.",
    def: "- **Free shipping above ₹5,000** | Calculated at checkout for pincodes we deliver to\n- **Secure online payment** | UPI, cards & netbanking\n- **Easy returns** | Buyer refunded first\n- **Fulfilled by sellers** | Packed & shipped by the seller who lists it",
  },

  {
    key: "heroCtaPrimary", group: "Homepage hero", label: "Hero — primary button label", kind: "text", max: 40,
    def: "Shop the catalogue",
  },
  {
    key: "heroCtaSecondary", group: "Homepage hero", label: "Hero — secondary button label", kind: "text", max: 50,
    def: "How the marketplace works",
  },

  /* ── Homepage headings (every section title) ───────────────────── */
  { key: "headCategories", group: "Homepage headings", label: "Categories section", kind: "text", max: 90, def: "Three ways in — hemp, Ayurveda, CBD" },
  { key: "headDeals", group: "Homepage headings", label: "Deals section", kind: "text", max: 90, def: "Today's deals from sellers" },
  { key: "headSponsored", group: "Homepage headings", label: "Sponsored section", kind: "text", max: 90, def: "Sponsored picks" },
  { key: "headBestsellers", group: "Homepage headings", label: "Bestsellers section", kind: "text", max: 90, def: "What buyers keep reordering" },
  { key: "headGoals", group: "Homepage headings", label: "Goals section", kind: "text", max: 90, def: "Built around your routine" },
  { key: "headLearn", group: "Homepage headings", label: "Learn section", kind: "text", max: 90, def: "New to hemp? Start here" },
  { key: "headWhy", group: "Homepage headings", label: "Why-us section", kind: "text", max: 90, def: "How the marketplace works" },
  { key: "headSellers", group: "Homepage headings", label: "Sellers section", kind: "text", max: 90, def: "Storefronts with their licences showing" },
  { key: "headTestimonials", group: "Homepage headings", label: "Testimonials section", kind: "text", max: 90, def: "What buyers say" },
  { key: "headFaq", group: "Homepage headings", label: "FAQ section", kind: "text", max: 90, def: "Common questions, straight answers" },

  /* ── Homepage sections ─────────────────────────────────────────── */
  {
    key: "flashSaleName", group: "Homepage sections", label: "Flash-sale campaign name", kind: "text", max: 60,
    def: "Monsoon Wellness Days",
  },
  {
    key: "explainerTitle", group: "Homepage sections", label: "Education explainer — title", kind: "text", max: 90,
    def: "Why hemp seed is an approved food in India (FSSAI)",
  },
  {
    key: "explainerBody", group: "Homepage sections", label: "Education explainer — body", kind: "rich", max: 900,
    def: "In 2021, India's food regulator (FSSAI) officially approved hemp seed, hemp seed oil and hemp seed flour as food. Hemp seed contains no meaningful THC — it's valued for complete plant protein and an omega 3:6 ratio close to what nutritionists recommend.\n\nThat's why hemp hearts and seed oil sit on Vedic Hemp under a standard food licence, while CBD products carry AYUSH licensing and a lab report for each batch.",
  },
  {
    key: "ctaSellerTitle", group: "Homepage sections", label: "Seller CTA — title", kind: "text", max: 60,
    def: "Become a seller",
  },
  {
    key: "ctaSellerBody", group: "Homepage sections", label: "Seller CTA — body", kind: "text", max: 260,
    def: "Licence checks, lab-report requirements and secure payouts are built in — you bring the product, we handle the rules.",
  },
  {
    key: "ctaAdvertiserTitle", group: "Homepage sections", label: "Advertiser CTA — title", kind: "text", max: 60,
    def: "Advertise with Vedic Hemp",
  },
  {
    key: "ctaAdvertiserBody", group: "Homepage sections", label: "Advertiser CTA — body", kind: "text", max: 260,
    def: "Labelled, reviewed placements across home, listings and product pages. Prescription-only (medical cannabis) products are never eligible — for anyone.",
  },

  {
    key: "healthGoals", group: "Homepage sections", label: "Shop-by-goal tiles", kind: "rich", max: 900,
    help: "One tile per line: Title | blurb | /link.",
    def: "- Sleep & calm | Evening rituals built on Ashwagandha and traditional calming herbs. | /catalogue?class=AYURVEDA\n- Daily nutrition | Hemp hearts and protein — complete plant protein with omega 3 & 6. | /catalogue?class=HEMP_FOOD\n- Muscle recovery | Topical CBD balms and roll-ons used in post-workout massage routines. | /catalogue?class=CBD_WELLNESS\n- Skin & body | Cold-pressed hemp seed oil, traditionally used in skin and hair care. | /catalogue?class=HEMP_FOOD\n- Digestive care | Triphala and classical churnas from the Ayurvedic tradition. | /catalogue?class=AYURVEDA\n- Focus | Adaptogen formulations used in daily study and work routines. | /catalogue?class=AYURVEDA",
  },
  {
    key: "pillars", group: "Homepage sections", label: "Why-us pillars", kind: "rich", max: 1600,
    help: "Each pillar: a heading, then its body paragraph.",
    def: "## Sellers publish their paperwork\n\nSellers submit their licences when they create an account, and upload batch lab reports for regulated listings. Documents are shown on the listing, so you can check before you buy.\n\n## Sellers own their listings\n\nProducts are listed and sold by independent sellers. Each seller is responsible for the genuineness, quality and compliance of what they list — their licence details are on their storefront.\n\n## A simple, honest order flow\n\nYou pay, we pass your order to the seller, the seller ships it directly to you and updates the status you track. Prescription-gated items stay gated — they are never advertised or recommended.\n\n## Your data stays in India\n\nPII and payment data live in Indian data centres. Health data is encrypted separately, and every access is logged and disclosed to you.",
  },

  /* ── Voices & FAQ ──────────────────────────────────────────────── */
  {
    key: "homeFaqs", group: "Voices & FAQ", label: "Homepage FAQ", kind: "rich", max: 2200,
    help: "Each question is a heading; the paragraphs beneath it are the answer. Also feeds the FAQPage structured data (SEO).",
    def: "## Is hemp legal to buy in India?\n\nYes. Hemp seed products (oil, protein, hearts) are FSSAI-approved foods. CBD wellness products are sold under AYUSH licensing with a lab report for each batch confirming THC at or below 0.3%, and are for ages 21 and over.\n\n## How do I know a product is genuinely lab-tested?\n\nEvery lab-tested product page shows its lab report for that exact batch, from an independent accredited lab. These products can't go on sale on Vedic Hemp without a passing report — there are no exceptions.\n\n## Do you sell medical cannabis?\n\nMedical cannabis exists on the platform but is prescription-only. It is never advertised, searchable or recommended. It becomes visible only to a signed-in buyer whose prescription a licensed pharmacist has verified.\n\n## How do I pay?\n\nAll orders are paid online — UPI, cards and netbanking. Cash on Delivery is not offered: your order reaches the seller only after your payment goes through. Age-restricted categories (CBD wellness) also require an ID check on delivery.\n\n## Where is my personal data stored?\n\nAll personal data and payment data are held in data centres located in India. Health data such as prescriptions is encrypted separately, and every access is logged and disclosed to you.",
  },
  {
    key: "testimonials", group: "Voices & FAQ", label: "Buyer testimonials", kind: "rich", max: 1600,
    help: "Each testimonial: a heading of \"Name · City · rating (1–5)\", then the quote beneath it. Only add real, consented buyer quotes — the section stays hidden until you do.",
    def: "",
  },

  /* ── Trust & About ─────────────────────────────────────────────── */
  {
    key: "trustIntro", group: "Trust & About", label: "How-it-works page — intro", kind: "rich", max: 500,
    def: "Products on Vedic Hemp are listed and sold by independent sellers — not by us. Sellers submit their licences when they join, ship every order through their delivery partner, and are responsible for what they list. Here is exactly who does what.",
  },
  {
    key: "aboutIntro", group: "Trust & About", label: "About page — intro", kind: "rich", max: 500,
    def: "Vedic Hemp is an online marketplace for hemp, CBD wellness, Ayurveda and medical cannabis in India — built so the rules are handled by the platform itself, not left to someone to remember to follow.",
  },

  /* ── Legal & policies (documents, not product copy) ────────────── */
  // Policy documents legitimately NAME the forbidden claim verbs ("no seller
  // may claim to treat…") and use "prevent" in its legal sense, so the claims
  // copy-check is skipped — same carve-out as the footer disclosure. These
  // fields must never hold product copy.
  {
    key: "legalTerms", group: "Legal & policies", label: "Terms of Service", kind: "rich", max: 8000,
    allowClaimVerbs: true,
    def: "Last updated: 13 July 2026\n\n## 1. Who we are\n\nVedic Hemp is a marketplace intermediary operated by WEBMM Consultants Private Limited, Pune, Maharashtra. Products on this platform are listed and sold by independent sellers — not by us. Each seller submits its licences at onboarding and is responsible for the genuineness, quality and compliance of its listings.\n\n## 2. Eligibility\n\nYou must be 21 or older to purchase age-gated categories (CBD wellness). Prescription-gated products (medical cannabis) additionally require a prescription verified by a licensed pharmacist. Products in these categories are never advertised, recommended or promoted — to anyone.\n\n## 3. Orders & payment\n\nOrders are confirmed only after payment is captured through the payment methods shown at checkout. All prices are in Indian Rupees and computed on our servers; the total shown at checkout is authoritative. An order is a purchase from the listing seller, forwarded by us after payment.\n\n## 4. Content rules\n\nNothing published on this platform — listings, reviews, questions or journal posts — may claim to cure, treat, prevent or diagnose any disease. Copy that does is blocked at the point of submission and repeat attempts may lead to account action.\n\n## 5. Cancellation & disputes\n\nYou can cancel before dispatch from your orders page. For problems after delivery, our returns policy applies: you are refunded first and we recover from the seller afterwards. Disputes are governed by the laws of India, courts of Pune, Maharashtra.\n\n## 6. Changes to these terms\n\nWe may update these terms with notice on this page. Fee changes for sellers always carry at least 30 days' written notice and are never retroactive.",
  },
  {
    key: "legalPrivacy", group: "Legal & policies", label: "Privacy Policy", kind: "rich", max: 8000,
    allowClaimVerbs: true,
    def: "Last updated: 13 July 2026\n\n## What we collect\n\nAccount details (name, email, phone), delivery addresses, order history, and — only if you buy prescription-gated products — the prescription you upload. Payment card details go directly to the payment provider; we never see or store a full card number.\n\n## Where your data lives\n\nAll personal data and payment data are held in data centres located in India. Health data such as prescriptions is encrypted separately and stored so it can't be altered or deleted.\n\n## Who can see health data\n\nOnly a licensed pharmacist or compliance officer can open a prescription, only with a logged reason — and you are notified every time it happens. That access log cannot be edited or deleted, by anyone.\n\n## What we never do\n\nWe do not sell personal data. We do not use health data for advertising, recommendations or analytics. Health information never appears in emails, push notifications or marketing of any kind.\n\n## Cookies\n\nWe use strictly necessary cookies only: your session, your cart and your sign-in state. There are no third-party advertising trackers on this site.\n\n## Your rights\n\nYou can access and correct your account data from your profile, and request deletion of your account by writing to the support address in the footer. Records we are legally required to keep (dispensing registers, audit logs) are kept in anonymised-where-possible form for the period the law requires.",
  },
  {
    key: "legalReturns", group: "Legal & policies", label: "Returns & Refunds Policy", kind: "rich", max: 6000,
    allowClaimVerbs: true,
    def: "Last updated: 13 July 2026\n\n## The one rule that matters\n\nYou are refunded first; we recover from the seller afterwards. You are never collateral in a dispute between the platform and a seller.\n\n## What can be returned\n\n- Damaged, tampered or wrong items: report within 48 hours of delivery with a photo — full refund, no questions.\n- Sealed, unopened products: returnable within 7 days of delivery.\n- Opened consumables (foods, oils, tinctures): not returnable for change of mind, as required for food-grade safety — but always returnable if the product is defective or the seal arrived broken.\n- Prescription-dispensed items: returnable only for damage or dispensing error, per pharmacy rules.\n\n## How to start a return\n\nOpen the order in My account → Orders and choose \"Return or report a problem\". Refunds go back to the original payment method within 5–7 business days of pickup — or instantly to your wallet if you choose store credit.\n\n## Recalls\n\nIf a batch you bought is ever recalled, we contact you directly with return instructions and a full refund — you do not need to ask.",
  },
  {
    key: "legalShipping", group: "Legal & policies", label: "Shipping Policy", kind: "rich", max: 6000,
    allowClaimVerbs: true,
    def: "Last updated: 13 July 2026\n\n## Who ships your order\n\nEvery order is packed and shipped by the seller who lists the product, through the seller's delivery partner. After payment is captured we forward your order to the seller; the tracking status you see is the same status the seller updates.\n\n## Costs & timelines\n\nShipping charges and any free-shipping threshold are always shown in your cart before you pay — the cart is authoritative. Most sellers send your order out within 24–48 hours; delivery estimates by pincode appear on each product page.\n\n## Age check on delivery\n\nAge-gated categories (CBD wellness, 21+) require an ID check at handover. The courier is instructed not to complete delivery without it. Prescription-gated items are dispensed and shipped only after pharmacist verification.\n\n## Coverage\n\nSellers ship across India wherever their delivery partners reach. If we can't deliver to your pincode for an item, the product page and checkout will tell you before payment, never after.",
  },

  /* ── SEO & metadata ────────────────────────────────────────────── */
  {
    key: "seoSiteTitle", group: "SEO & metadata", label: "Site title (default <title>)", kind: "text", max: 90,
    def: "Vedic Hemp — India's trusted, licensed hemp & wellness marketplace",
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
    def: "Shop hemp food, Ayurveda and CBD wellness listed by independent licensed sellers across India. Sellers share their licences when they join and ship directly to you.",
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

/** Menu lines: "- Label | /path" → link list (invalid lines are skipped). */
export function parseMenu(md: string): { label: string; href: string }[] {
  return NORM(md)
    .split("\n")
    .map((l) => l.trim().replace(/^-\s+/, ""))
    .filter(Boolean)
    .map((l) => {
      const [label = "", href = ""] = l.split("|").map((x) => x.trim());
      return { label: label.replace(/\*\*/g, ""), href };
    })
    .filter((x) => x.label && x.href.startsWith("/"));
}

/** Goal tiles: "- Title | blurb | /link". */
export function parseGoals(md: string): { title: string; blurb: string; href: string }[] {
  return NORM(md)
    .split("\n")
    .map((l) => l.trim().replace(/^-\s+/, ""))
    .filter(Boolean)
    .map((l) => {
      const [title = "", blurb = "", href = "/catalogue"] = l.split("|").map((x) => x.trim());
      return { title: title.replace(/\*\*/g, ""), blurb, href: href.startsWith("/") ? href : "/catalogue" };
    })
    .filter((g) => g.title);
}
