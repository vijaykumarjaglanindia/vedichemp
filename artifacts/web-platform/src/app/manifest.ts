import type { MetadataRoute } from "next";

/** PWA manifest — installable storefront, light theme locked. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vedic Hemp — regulated hemp & wellness marketplace",
    short_name: "Vedic Hemp",
    description: "Hemp food, Ayurveda and CBD wellness from independent licensed sellers across India.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f7f7",
    theme_color: "#f2f7f7",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
