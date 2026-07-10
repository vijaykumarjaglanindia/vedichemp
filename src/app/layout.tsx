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
    "Lab-verified hemp nutrition, CBD wellness, Ayurveda and prescription-gated medical cannabis. Every regulated batch ships with a Certificate of Analysis.",
  keywords: ["hemp", "CBD", "Ayurveda", "wellness", "India", "lab verified", "marketplace"],
  openGraph: {
    type: "website",
    siteName: "Vedic Hemp",
    title: "Vedic Hemp — Hemp, wellness and Ayurveda you can verify",
    description: "A regulated multi-vendor marketplace. Batch-matched lab reports, licensed sellers, prescription-gated medical cannabis.",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: "Vedic Hemp", description: "India's regulated hemp & wellness marketplace." },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f7f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1716" },
  ],
  width: "device-width",
  initialScale: 1,
};

/** Applies the persisted theme before first paint — no flash of wrong theme. */
const themeInit = `(function(){try{var t=localStorage.getItem("vh-theme");if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t}}catch(e){}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning className={`${sans.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
