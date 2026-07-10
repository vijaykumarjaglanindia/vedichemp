import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Manrope, Fraunces } from "next/font/google";
import "./globals.css";

/**
 * Typography — Manrope carries the product (geometric, open, premium fintech
 * tone); Fraunces is the display voice for marketing surfaces (Ayurvedic
 * heritage without pastiche). Loaded via next/font: self-hosted at build,
 * zero layout shift, no render-blocking CSS.
 */
const sans = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});
const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vedichemp.in"),
  title: { default: "Vedic Hemp — India's regulated hemp & wellness marketplace", template: "%s · Vedic Hemp" },
  description:
    "India's marketplace for hemp nutrition, CBD wellness and Ayurveda — products listed and shipped by independent licensed sellers.",
  keywords: ["hemp", "CBD", "Ayurveda", "wellness", "India", "lab verified", "marketplace"],
  openGraph: {
    type: "website",
    siteName: "Vedic Hemp",
    title: "Vedic Hemp — India's hemp, Ayurveda & CBD wellness marketplace",
    description: "A multi-vendor marketplace: independent licensed sellers list, ship and stand behind their products.",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: "Vedic Hemp", description: "India's regulated hemp & wellness marketplace." },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#f2f7f7",
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
