import type { MetadataRoute } from "next";
import { readSiteContent } from "@/lib/sitecontent";

/** PWA manifest — installable storefront, light theme locked. The names come
 *  from the same site-content fields the header and metadata use, so renaming
 *  the site renames the installed app too. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const c = await readSiteContent();
  return {
    name: c.seoSiteTitle ?? c.siteName ?? "Vedic Hemp",
    short_name: c.siteName ?? "Vedic Hemp",
    description: c.seoSiteDesc ?? "Hemp food, Ayurveda and CBD wellness from independent licensed sellers across India.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f7f7",
    theme_color: "#f2f7f7",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
