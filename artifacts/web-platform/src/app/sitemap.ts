import type { MetadataRoute } from "next";
import { readLiveProducts } from "@/lib/catalog";

// The sitemap reflects the LIVE store per request — a listing that goes live
// (or is archived) is in (or out) of the next crawl, not the next deploy.
export const dynamic = "force-dynamic";
import { publishedPosts } from "@/lib/cms";
import { readCategories } from "@/lib/categories";
import { STORE_PROFILES } from "./(site)/_lib/data";

/**
 * Public, indexable routes only. Console routes (/account, /seller, /admin)
 * are authenticated surfaces and stay out of the sitemap; MED_CANNABIS never
 * has a public URL to list in the first place (A1 — absent, not hidden).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://vedichemp.in";
  const now = new Date();
  const statics = [
    "", "/catalogue", "/stores", "/trust", "/about", "/sell", "/blog", "/verify", "/gifts", "/compare", "/help",
    "/legal/terms", "/legal/privacy", "/legal/returns", "/legal/shipping",
  ].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));
  // The LIVE store only — a draft or archived listing has no public URL to list.
  const products = (await readLiveProducts()).filter((p) => p.cls !== "MED_CANNABIS").map((p) => ({
    url: `${base}/products/${p.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));
  // Published journal posts only — drafts have no public URL at all.
  const posts = (await publishedPosts()).map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  const stores = Object.keys(STORE_PROFILES).map((slug) => ({
    url: `${base}/store/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  // Visible category landing pages (A1: CATEGORY_CLASSES excludes MED_CANNABIS).
  const categories = (await readCategories()).map((c) => ({
    url: `${base}/category/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  return [...statics, ...products, ...posts, ...stores, ...categories];
}
