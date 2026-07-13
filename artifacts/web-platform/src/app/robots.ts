import type { MetadataRoute } from "next";

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
    sitemap: "https://vedichemp.in/sitemap.xml",
  };
}
