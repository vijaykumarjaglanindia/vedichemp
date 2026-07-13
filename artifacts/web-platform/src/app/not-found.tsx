/**
 * VEDIC HEMP — GLOBAL 404 (URL matched no route at all)
 *
 * The (site) group has its own richer not-found with the full chrome; this
 * one catches everything outside it so no visitor ever sees the framework's
 * unbranded default.
 */

import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "88px 20px", textAlign: "center" }}>
      <div aria-hidden style={{ fontSize: "2.4rem", marginBottom: 12 }}>🌿</div>
      <h1 style={{ fontSize: "1.5rem", marginBottom: 10, color: "var(--vh-ink, #1c2b21)" }}>
        That page doesn&rsquo;t exist
      </h1>
      <p className="muted" style={{ marginBottom: 22 }}>
        The link may be old or mistyped. Everything on the marketplace is reachable from the
        homepage or the Help Centre.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/" className="vh-btn vh-btn-primary">Back to the homepage</Link>
        <Link href="/help" className="vh-btn vh-btn-ghost">Help Centre</Link>
      </div>
    </div>
  );
}
