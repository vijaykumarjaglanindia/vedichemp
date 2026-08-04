import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { withBase } from "@/lib/base";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Authenticated consoles and APIs are not for crawlers.
        disallow: ["/account", "/seller", "/admin", "/api", "/cart", "/checkout", "/signin", "/seller-login"],
      },
    ],
    sitemap: `${SITE_URL}${withBase("/sitemap.xml")}`,
  };
}
