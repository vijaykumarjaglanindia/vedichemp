/**
 * VEDIC HEMP — PUBLIC SITE 404
 *
 * Branded not-found with a next action (never a dead end). Note that a
 * MED_CANNABIS product URL does NOT land here — the PDP intentionally renders
 * its own identical "not available" empty state for unknown and restricted
 * slugs alike, so a 404 can't be used to probe the restricted catalogue (A1).
 */

import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function SiteNotFound() {
  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-6)", paddingBottom: "var(--sp-7)" }}>
      <EmptyState
        icon="🌿"
        headline="This page doesn't exist"
        sub="The link may be old, mistyped, or the page may have moved. The catalogue is the best place to start."
        cta={{ label: "Browse the catalogue", href: "/catalogue" }}
      />
      <p className="small muted" style={{ textAlign: "center", marginTop: "var(--sp-3)" }}>
        Or go back to the <Link href="/">homepage</Link> · read about{" "}
        <Link href="/trust">how we verify products</Link>
      </p>
    </div>
  );
}
