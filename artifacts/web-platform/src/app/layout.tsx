import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import { readThemePreset, themeCss } from "@/lib/features";
import { readSiteContent } from "@/lib/sitecontent";
import "./globals.css";

/**
 * Typography — a three-voice system, self-hosted via next/font (zero layout
 * shift, no render-blocking CSS):
 *   • Inter — UI and body. The professional standard: neutral, crisp, dark
 *     and legible at text sizes and in dense console tables.
 *   • Plus Jakarta Sans — functional headings (h2–h4, console titles):
 *     geometric, confident, modern.
 *   • Fraunces — the editorial voice for marketing hero + section headlines.
 *     A high-contrast "old-style" soft-serif with optical sizing; it gives the
 *     public storefront a premium, apothecary-meets-modern character that a
 *     geometric sans cannot. Scoped to display moments, never the consoles.
 */
const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["600", "700", "800"],
});
const serif = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

// Site-wide metadata defaults are admin-edited (Site content → SEO & metadata).
export async function generateMetadata(): Promise<Metadata> {
  const content = await readSiteContent();
  return {
    metadataBase: new URL("https://vedichemp.in"),
    title: { default: content.seoSiteTitle ?? "Vedic Hemp", template: `%s · ${content.siteName ?? "Vedic Hemp"}` },
    description: content.seoSiteDesc,
    keywords: ["hemp", "CBD", "Ayurveda", "wellness", "India", "lab verified", "marketplace"],
    applicationName: "Vedic Hemp",
    openGraph: {
      type: "website",
      siteName: "Vedic Hemp",
      title: content.seoSiteTitle,
      description: content.seoSiteDesc,
      locale: "en_IN",
    },
    twitter: { card: "summary_large_image", title: "Vedic Hemp", description: content.seoSiteDesc },
    robots: { index: true, follow: true },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#f2f7f7",
  // Light theme only — the browser is told not to auto-darken anything
  // (form controls, scrollbars, UA surfaces) even when the OS is in dark mode.
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Curated light-only theme preset (Admin > Features & tools). Dark type on
  // light backgrounds is policy, not a preset — only accent/shape vary.
  const preset = await readThemePreset();
  const css = themeCss(preset);
  return (
    <html lang="en-IN" suppressHydrationWarning className={`${sans.variable} ${display.variable} ${serif.variable}`}>
      <body>
        {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
        {children}
      </body>
    </html>
  );
}
