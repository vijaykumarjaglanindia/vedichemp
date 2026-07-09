import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vedic Hemp", template: "%s · Vedic Hemp" },
  description:
    "A regulated multi-vendor marketplace for hemp, CBD wellness, Ayurveda and medical cannabis in India.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
