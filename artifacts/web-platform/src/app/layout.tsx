import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
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
