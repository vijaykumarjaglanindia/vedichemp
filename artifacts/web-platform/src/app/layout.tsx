import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { readSiteContent } from "@/lib/sitecontent";
import "./globals.css";

/**
 * Typography — Inter for UI and body (the professional standard: neutral,
 * highly legible, dark and crisp at text sizes); Plus Jakarta Sans for
 * display headlines (geometric, confident, modern-premium). Self-hosted via
 * next/font: zero layout shift, no render-blocking CSS.
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

// Site-wide metadata defaults are admin-edited (Site content → SEO & metadata).
export async function generateMetadata(): Promise<Metadata> {
  const content = await readSiteContent();
  return {
    metadataBase: new URL("https://vedichemp.in"),
    title: { default: content.seoSiteTitle ?? "Vedic Hemp", template: "%s · Vedic Hemp" },
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
