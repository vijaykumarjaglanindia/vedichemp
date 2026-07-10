/**
 * VEDIC HEMP — STRUCTURED DATA (JSON-LD)
 *
 * Schema.org builders for the public site. Compliance note: structured data is
 * a public surface, so the same rules apply — no MED_CANNABIS products (A1),
 * no disease claims in descriptions (Drugs & Magic Remedies Act).
 */

import type { SampleProduct } from "@/lib/sample";
import { rupees } from "@/lib/money";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Vedic Hemp",
    url: "https://vedichemp.in",
    description: "India's regulated marketplace for hemp nutrition, CBD wellness and Ayurveda. Every regulated batch ships with a lab-verified Certificate of Analysis.",
    address: { "@type": "PostalAddress", addressCountry: "IN" },
    sameAs: [],
  };
}

export function productJsonLd(p: SampleProduct) {
  if (p.cls === "MED_CANNABIS") throw new Error("A1: MED_CANNABIS never appears in public structured data.");
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    brand: { "@type": "Brand", name: p.seller },
    aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: Math.round(p.rating * 37) },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: rupees(p.pricePaise).toFixed(2),
      availability: "https://schema.org/InStock",
      url: `https://vedichemp.in/products/${p.slug}`,
    },
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `https://vedichemp.in${it.href}`,
    })),
  };
}
