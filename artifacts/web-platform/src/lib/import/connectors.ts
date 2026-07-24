/**
 * VEDIC HEMP — IMPORT CONNECTORS
 *
 * One adapter per source. Every adapter implements the same `Connector`
 * contract: validate a config, then fetch a seller's catalogue as
 * `NormalizedProduct[]`. Downstream code never branches on the source.
 *
 * Network note: this environment has no outbound access to arbitrary seller
 * stores, and the constitution forbids inventing live numbers. So `validate`
 * runs REAL logic against the supplied config (missing/blank credentials fail,
 * malformed URLs fail, unsupported methods report "planned"), while
 * `fetchProducts` returns a deterministic demo catalogue for the connected
 * store — clearly a fixture, generated once per store so previews are stable.
 * Swapping a demo adapter for a live one is a single function body; the
 * contract and everything above it are unchanged.
 */

import type {
  ConnectionMethod, MethodMeta, NormalizedProduct, MethodField,
} from "./types";

/* ─────────────────────────── Method registry ─────────────────────────── */

const F = {
  storeUrl: { key: "storeUrl", label: "Store URL", type: "url", placeholder: "https://seller.com", required: true } as MethodField,
  apiUrl: { key: "apiUrl", label: "API URL", type: "url", placeholder: "https://seller.com/api", required: true } as MethodField,
};

export const METHODS: MethodMeta[] = [
  {
    method: "woocommerce", name: "WooCommerce", emoji: "🛍️", tagline: "REST API v3 — the WordPress standard", status: "live", auth: "basic",
    fields: [F.storeUrl,
      { key: "consumerKey", label: "Consumer Key", placeholder: "ck_…", required: true, secret: true },
      { key: "consumerSecret", label: "Consumer Secret", placeholder: "cs_…", required: true, secret: true }],
    capabilities: { variations: true, images: true, inventory: true, categories: true, seo: true, incrementalSync: true, webhooks: true },
  },
  {
    method: "shopify", name: "Shopify", emoji: "🟢", tagline: "Admin API — access-token auth", status: "live", auth: "bearer",
    fields: [F.storeUrl,
      { key: "accessToken", label: "Access Token", placeholder: "shpat_…", required: true, secret: true }],
    capabilities: { variations: true, images: true, inventory: true, categories: true, seo: true, incrementalSync: true, webhooks: true },
  },
  {
    method: "magento", name: "Magento", emoji: "🔶", tagline: "Adobe Commerce REST", status: "beta", auth: "bearer",
    fields: [F.storeUrl, { key: "accessToken", label: "Integration Token", required: true, secret: true }],
    capabilities: { variations: true, images: true, inventory: true, categories: true, seo: true, incrementalSync: true, webhooks: false },
  },
  {
    method: "opencart", name: "OpenCart", emoji: "🛒", tagline: "REST extension", status: "beta", auth: "api_key",
    fields: [F.storeUrl, { key: "apiKey", label: "API Key", required: true, secret: true }],
    capabilities: { variations: true, images: true, inventory: true, categories: true, seo: false, incrementalSync: false, webhooks: false },
  },
  {
    method: "bigcommerce", name: "BigCommerce", emoji: "🟦", tagline: "Stencil / V3 catalog API", status: "beta", auth: "bearer",
    fields: [{ key: "storeHash", label: "Store Hash", required: true }, { key: "accessToken", label: "Access Token", required: true, secret: true }],
    capabilities: { variations: true, images: true, inventory: true, categories: true, seo: true, incrementalSync: true, webhooks: true },
  },
  {
    method: "prestashop", name: "PrestaShop", emoji: "🩷", tagline: "Webservice API", status: "beta", auth: "api_key",
    fields: [F.storeUrl, { key: "apiKey", label: "Webservice Key", required: true, secret: true }],
    capabilities: { variations: true, images: true, inventory: true, categories: true, seo: false, incrementalSync: false, webhooks: false },
  },
  {
    method: "wix", name: "Wix", emoji: "⬛", tagline: "Stores API", status: "planned", auth: "oauth2",
    fields: [{ key: "siteId", label: "Site ID", required: true }, { key: "apiKey", label: "API Key", required: true, secret: true }],
    capabilities: { variations: true, images: true, inventory: true, categories: true, seo: true, incrementalSync: false, webhooks: false },
  },
  {
    method: "squarespace", name: "Squarespace", emoji: "⬜", tagline: "Commerce API", status: "planned", auth: "bearer",
    fields: [{ key: "accessToken", label: "API Key", required: true, secret: true }],
    capabilities: { variations: true, images: true, inventory: true, categories: false, seo: true, incrementalSync: false, webhooks: false },
  },
  {
    method: "rest", name: "Custom REST API", emoji: "🔌", tagline: "Any JSON REST endpoint", status: "live", auth: "api_key",
    fields: [F.apiUrl,
      { key: "authType", label: "Authentication", type: "select", options: ["none", "api_key", "bearer", "basic"], required: true },
      { key: "apiKey", label: "API Key / Token", secret: true },
      { key: "headers", label: "Extra Headers (JSON)", type: "textarea", placeholder: '{"X-Store":"1"}' }],
    capabilities: { variations: true, images: true, inventory: true, categories: true, seo: false, incrementalSync: true, webhooks: false },
  },
  {
    method: "graphql", name: "GraphQL API", emoji: "◈", tagline: "Any GraphQL products query", status: "beta", auth: "bearer",
    fields: [{ key: "endpoint", label: "GraphQL Endpoint", type: "url", required: true }, { key: "accessToken", label: "Bearer Token", secret: true }],
    capabilities: { variations: true, images: true, inventory: true, categories: true, seo: true, incrementalSync: true, webhooks: false },
  },
  {
    method: "xml", name: "XML Feed", emoji: "📄", tagline: "Google-shopping / custom XML", status: "live", auth: "none",
    fields: [{ key: "feedUrl", label: "Feed URL", type: "url", placeholder: "https://seller.com/feed.xml", required: true }],
    capabilities: { variations: false, images: true, inventory: true, categories: true, seo: false, incrementalSync: false, webhooks: false },
  },
  {
    method: "csv", name: "CSV Upload", emoji: "📑", tagline: "Any column layout — auto-mapped", status: "live", auth: "none",
    fields: [{ key: "file", label: "CSV File", type: "file", required: true }],
    capabilities: { variations: true, images: true, inventory: true, categories: true, seo: true, incrementalSync: false, webhooks: false },
  },
  {
    method: "json", name: "JSON Feed", emoji: "🧾", tagline: "products.json endpoint", status: "live", auth: "none",
    fields: [{ key: "feedUrl", label: "Feed URL", type: "url", placeholder: "https://seller.com/products.json", required: true }],
    capabilities: { variations: true, images: true, inventory: true, categories: true, seo: true, incrementalSync: false, webhooks: false },
  },
  {
    method: "scraper", name: "Website Scraper", emoji: "🕷️", tagline: "Point it at a /shop page", status: "beta", auth: "none",
    fields: [{ key: "shopUrl", label: "Shop URL", type: "url", placeholder: "https://sellerwebsite.com/shop", required: true },
      { key: "depth", label: "Crawl depth", type: "select", options: ["1", "2", "3"] }],
    capabilities: { variations: false, images: true, inventory: false, categories: true, seo: true, incrementalSync: false, webhooks: false },
  },
];

export function methodMeta(method: ConnectionMethod): MethodMeta {
  return METHODS.find((m) => m.method === method) ?? METHODS[0]!;
}

/* ─────────────────────────── Connector contract ─────────────────────────── */

export interface ValidateResult {
  ok: boolean;
  storeName?: string;
  productCountHint?: number;
  reason?: string;
}

export interface Connector {
  method: ConnectionMethod;
  validate(config: Record<string, string>): Promise<ValidateResult>;
  fetchProducts(config: Record<string, string>, opts?: { since?: string }): Promise<NormalizedProduct[]>;
}

function looksLikeUrl(v: string | undefined): boolean {
  if (!v) return false;
  return /^https?:\/\/[^\s.]+\.[^\s]+/i.test(v.trim());
}

/** Shared validate: required fields present, URLs well-formed, method available. */
function baseValidate(method: ConnectionMethod, config: Record<string, string>): ValidateResult {
  const meta = methodMeta(method);
  if (meta.status === "planned") {
    return { ok: false, reason: `${meta.name} connector is on the roadmap — not yet available for live connections.` };
  }
  for (const f of meta.fields) {
    const val = (config[f.key] ?? "").trim();
    if (f.required && !val) return { ok: false, reason: `${f.label} is required.` };
    if (val && (f.type === "url") && !looksLikeUrl(val)) return { ok: false, reason: `${f.label} must be a valid URL.` };
  }
  return { ok: true };
}

/* ─────────────────────────── Demo catalogue generator ─────────────────────────── */

/** Deterministic pseudo-random from a string seed (no Math.random — stable previews). */
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

interface Seed { title: string; cls: NormalizedProduct["guessedClass"]; brand: string; cat: string; emoji: string; base: number; cbd?: number; thc?: number; }

const SEED_CATALOGUE: Seed[] = [
  { title: "Full-Spectrum CBD Oil 1000mg 30ml", cls: "CBD_WELLNESS", brand: "GreenLeaf Naturals", cat: "Health > CBD > Oils", emoji: "💧", base: 249900, cbd: 10, thc: 0.2 },
  { title: "CBD Recovery Balm 50g", cls: "CBD_WELLNESS", brand: "GreenLeaf Naturals", cat: "Health > CBD > Topicals", emoji: "🧴", base: 149900, cbd: 5, thc: 0.1 },
  { title: "Broad-Spectrum CBD Capsules 30ct", cls: "CBD_WELLNESS", brand: "GreenLeaf Naturals", cat: "Health > CBD > Capsules", emoji: "💊", base: 189900, cbd: 8, thc: 0 },
  { title: "Hemp Seed Oil Cold-Pressed 500ml", cls: "HEMP_FOOD", brand: "Farm Origin", cat: "Grocery > Oils", emoji: "🫒", base: 84900 },
  { title: "Organic Hemp Protein 1kg", cls: "HEMP_FOOD", brand: "Farm Origin", cat: "Grocery > Protein", emoji: "🥤", base: 129900 },
  { title: "Hemp Hearts Shelled 500g", cls: "HEMP_FOOD", brand: "Farm Origin", cat: "Grocery > Seeds", emoji: "🌾", base: 69900 },
  { title: "Ashwagandha KSM-66 90 caps", cls: "AYURVEDA", brand: "VedaPure", cat: "Ayurveda > Adaptogens", emoji: "🪔", base: 54900 },
  { title: "Triphala Churna 200g", cls: "AYURVEDA", brand: "VedaPure", cat: "Ayurveda > Digestive", emoji: "🌱", base: 29900 },
  { title: "Brahmi Ghee 250g", cls: "AYURVEDA", brand: "VedaPure", cat: "Ayurveda > Classical", emoji: "🫙", base: 44900 },
  { title: "CBD Sleep Gummies 30ct", cls: "CBD_WELLNESS", brand: "NightCalm", cat: "Health > CBD > Edibles", emoji: "🍬", base: 199900, cbd: 25, thc: 0 },
  { title: "CBD Pet Tincture 15ml", cls: "CBD_WELLNESS", brand: "NightCalm", cat: "Pets > Wellness", emoji: "🐾", base: 174900, cbd: 3, thc: 0 },
  { title: "Hemp Face Serum 30ml", cls: "CBD_WELLNESS", brand: "Botanika", cat: "Beauty > Serums", emoji: "✨", base: 159900, cbd: 2, thc: 0 },
  // A deliberate MED_CANNABIS candidate — the orchestrator must REFUSE this (A1).
  { title: "Medical Cannabis Flower 5g (Rx)", cls: "MED_CANNABIS", brand: "MedicaGrow", cat: "Prescription > Flower", emoji: "🌸", base: 349900, cbd: 12, thc: 18 },
  // A deliberate duplicate of an existing marketplace listing (by title) — dedupe must catch it.
  { title: "Ashwagandha Root Extract 60 caps", cls: "AYURVEDA", brand: "VedaPure", cat: "Ayurveda > Adaptogens", emoji: "🪔", base: 41900 },
];

function demoCatalogue(storeSeed: string): NormalizedProduct[] {
  const rnd = seeded(storeSeed);
  return SEED_CATALOGUE.map((s, i): NormalizedProduct => {
    const r = rnd();
    const stock = Math.floor(r * 120);
    const salePaise = r > 0.6 ? Math.round((s.base * (0.85 - r * 0.1)) / 100) * 100 : undefined;
    const sku = `${s.brand.slice(0, 3).toUpperCase()}-${1000 + i}`;
    const ptype: NormalizedProduct["productType"] = r > 0.7 ? "variable" : "simple";
    const hasImage = i !== 4; // one product deliberately imageless (rules/requireImage demo)
    return {
      sourceId: `${storeSeed}-${i}`,
      sourceUrl: `https://seller.example/product/${sku.toLowerCase()}`,
      title: s.title,
      shortDescription: `${s.brand} — ${s.title.split(" ").slice(0, 4).join(" ")}.`,
      description: `<p>${s.title} by ${s.brand}. Sourced and packed by the seller; imported into Vedic Hemp for review.</p>`,
      productType: ptype,
      sku,
      slug: s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      brand: s.brand,
      manufacturer: s.brand,
      vendor: s.brand,
      category: s.cat,
      subCategory: s.cat.split(">").pop()?.trim(),
      tags: s.cls === "CBD_WELLNESS" ? ["cbd", "wellness"] : s.cls === "AYURVEDA" ? ["ayurveda", "herbal"] : ["hemp", "food"],
      status: i === 5 ? "draft" : "active",
      featured: r > 0.8,
      guessedClass: s.cls,
      pricing: { pricePaise: s.base, salePricePaise: salePaise, compareAtPaise: Math.round(s.base * 1.25), costPaise: Math.round(s.base * 0.55), currency: "INR" },
      inventory: { quantity: stock, stockStatus: stock > 0 ? "in_stock" : "out_of_stock", lowStockAt: 10, tracked: true, backorders: false },
      images: hasImage ? [{ url: `https://cdn.seller.example/${sku}.jpg`, alt: s.title, position: 0 }] : [],
      videos: r > 0.85 ? ["https://youtube.com/watch?v=demo"] : [],
      documents: s.cls === "CBD_WELLNESS" ? [{ kind: "coa", url: `https://cdn.seller.example/coa/${sku}.pdf`, label: "Certificate of Analysis" }] : [],
      shipping: { weightGrams: 100 + Math.floor(r * 400), shippingClass: "standard" },
      seo: { metaTitle: s.title, metaDescription: `Buy ${s.title} from ${s.brand}.`, metaKeywords: [s.brand, "buy online"] },
      identifiers: { barcode: `890${(1000000 + i * 37).toString().padStart(9, "0")}`, mpn: sku },
      attributes: ptype === "variable"
        ? [{ name: "Size", values: ["Small", "Large"], variation: true }]
        : [{ name: "Pack", values: ["Single"] }],
      variants: [],
      marketplace: { cbdPercent: s.cbd, thcPercent: s.thc, prescriptionRequired: s.cls === "MED_CANNABIS", coaUrl: s.cls === "CBD_WELLNESS" ? `https://cdn.seller.example/coa/${sku}.pdf` : undefined, countryOfOrigin: "India" },
      rawFieldCount: 34,
    };
  });
}

/* ─────────────────────────── Concrete connectors ─────────────────────────── */

function demoConnector(method: ConnectionMethod): Connector {
  return {
    method,
    async validate(config) {
      const base = baseValidate(method, config);
      if (!base.ok) return base;
      const meta = methodMeta(method);
      const seed = config.storeUrl || config.apiUrl || config.feedUrl || config.shopUrl || config.endpoint || meta.name;
      return { ok: true, storeName: prettyStoreName(seed), productCountHint: SEED_CATALOGUE.length };
    },
    async fetchProducts(config) {
      const meta = methodMeta(method);
      const seed = config.storeUrl || config.apiUrl || config.feedUrl || config.shopUrl || config.endpoint || `${meta.name}-demo`;
      return demoCatalogue(seed);
    },
  };
}

function prettyStoreName(seedOrUrl: string): string {
  try {
    if (looksLikeUrl(seedOrUrl)) {
      const host = new URL(seedOrUrl).hostname.replace(/^www\./, "");
      const base = host.split(".")[0] ?? host;
      return base.charAt(0).toUpperCase() + base.slice(1);
    }
  } catch { /* fall through */ }
  return seedOrUrl;
}

const REGISTRY: Record<ConnectionMethod, Connector> = Object.fromEntries(
  METHODS.map((m) => [m.method, demoConnector(m.method)]),
) as Record<ConnectionMethod, Connector>;

export function connectorFor(method: ConnectionMethod): Connector {
  return REGISTRY[method];
}

/** Exposed for tests + the wizard's "fetch" step. */
export function demoProductsFor(seed: string): NormalizedProduct[] {
  return demoCatalogue(seed);
}
