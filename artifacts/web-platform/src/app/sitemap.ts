import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/lib/sample";

/**
 * Public, indexable routes only. Console routes (/account, /seller, /admin)
 * are authenticated surfaces and stay out of the sitemap; MED_CANNABIS never
 * has a public URL to list in the first place (A1 — absent, not hidden).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://vedichemp.in";
  const now = new Date();
  const statics = ["", "/catalogue", "/trust", "/about", "/sell"].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));
  const products = PRODUCTS.filter((p) => p.cls !== "MED_CANNABIS").map((p) => ({
    url: `${base}/products/${p.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));
  return [...statics, ...products];
}
