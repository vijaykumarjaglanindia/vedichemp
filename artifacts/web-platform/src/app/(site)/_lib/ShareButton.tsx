"use client";

/**
 * VEDIC HEMP — SHARE BUTTON (storefront island)
 *
 * navigator.share where available, clipboard fallback elsewhere. Shares only
 * the public storefront URL — never order or account state.
 */

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user dismissed the share sheet */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="vh-btn vh-btn-ghost"
      style={{ background: "var(--vh-surface)", borderColor: "var(--vh-line-strong)", color: "var(--vh-ink)", gap: 8 }}
    >
      {copied ? <Check size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-ok)" }} /> : <Share2 size={15} strokeWidth={2.2} aria-hidden />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
