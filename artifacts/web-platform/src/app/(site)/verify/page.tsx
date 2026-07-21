/**
 * VEDIC HEMP — BATCH VERIFICATION (public provenance lookup)
 *
 * The QR on every regulated pack resolves here: enter (or scan to) a batch
 * code and see the exact product, seller and lab report it belongs to. The
 * lookup is deliberately narrow — batch → listing → CoA status — and it never
 * reveals anything about prescription-only products (A1: an unknown code and
 * a MED_CANNABIS code produce the identical "not found" response).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical, Search, ShieldCheck } from "lucide-react";
import { Banner, Card, StatusPill } from "@/components/ui";
import { CLASS_META } from "@/lib/compliance";
import { publicProducts, specsFor } from "../_lib/data";

export const metadata: Metadata = {
  title: "Verify a batch",
  description: "Enter the batch code printed on your pack to see the exact product, seller and lab report it belongs to — provenance you can check before you open the seal.",
  alternates: { canonical: "/verify" },
};

/** batch code → the public product it belongs to (permitted classes only). */
async function findByBatch(code: string) {
  const norm = code.trim().toUpperCase();
  if (!norm) return null;
  for (const p of await publicProducts()) {
    const specs = specsFor(p);
    if (specs.batch.toUpperCase() === norm) return { product: p, specs };
  }
  return null;
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const hit = code !== undefined ? await findByBatch(code) : null;

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)", maxWidth: 760 }}>
      <div className="vh-section-head">
        <span className="vh-eyebrow">Provenance</span>
        <h1 className="vh-display" style={{ fontSize: "clamp(1.6rem, 1.2rem + 1.6vw, 2.2rem)", marginTop: 8 }}>
          Verify the batch in your hands
        </h1>
        <p className="muted" style={{ maxWidth: "58ch" }}>
          Every regulated pack carries its batch code (and a QR that opens this page). Enter it to
          see the exact listing, seller and lab report for that batch — checked against the
          platform, not the label.
        </p>
      </div>

      <Card>
        <form method="get" className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
          <div className="vh-field" style={{ flex: "1 1 240px" }}>
            <label className="vh-label" htmlFor="vf-code">Batch code</label>
            <input className="vh-input mono" id="vf-code" name="code" defaultValue={code ?? ""} placeholder="e.g. VB-2406" maxLength={20} />
          </div>
          <button className="vh-btn vh-btn-primary" type="submit" style={{ alignSelf: "end" }}>
            <Search size={15} strokeWidth={2.2} aria-hidden /> Verify
          </button>
        </form>
      </Card>

      {code !== undefined && (
        <div style={{ marginTop: "var(--sp-3)" }}>
          {hit ? (
            <Card title={<span className="vh-row" style={{ gap: 8 }}><ShieldCheck size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} /> Batch {hit.specs.batch} — verified</span>}>
              <div className="vh-grid" style={{ gap: 10 }}>
                <div className="vh-row" style={{ gap: 12, flexWrap: "wrap" }}>
                  <span className="vh-product-media" style={{ width: 56, height: 56, fontSize: "1.6rem" }} aria-hidden>{hit.product.emoji}</span>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontWeight: 800, color: "var(--vh-ink)" }}>{hit.product.title}</div>
                    <div className="small muted">Sold by {hit.product.seller} · {CLASS_META[hit.product.cls].label}</div>
                  </div>
                  <StatusPill tone={hit.product.labVerified ? "ok" : "neutral"}>
                    {hit.product.labVerified ? "Lab report verified" : "Licensed food product"}
                  </StatusPill>
                </div>
                <dl className="small" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", margin: 0 }}>
                  <dt className="muted">Testing lab</dt><dd style={{ margin: 0 }}>{hit.specs.lab}</dd>
                  <dt className="muted">Ingredients</dt><dd style={{ margin: 0 }}>{hit.specs.ingredients}</dd>
                  <dt className="muted">Net quantity</dt><dd style={{ margin: 0 }}>{hit.specs.netWeight}</dd>
                </dl>
                <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <Link href={`/products/${hit.product.slug}`} className="vh-btn vh-btn-outline vh-btn-sm">
                    <FlaskConical size={14} strokeWidth={2.2} aria-hidden /> View listing & lab report
                  </Link>
                  <span className="small muted">If the code on your pack doesn&rsquo;t match what you ordered, report the listing — you&rsquo;re refunded first.</span>
                </div>
              </div>
            </Card>
          ) : (
            <Banner severity="danger" title={`No batch found for “${code}”`}>
              Check the code against the pack — it&rsquo;s printed next to the manufacturing date. If it
              still doesn&rsquo;t verify, do not consume the product:{" "}
              <Link href="/account/support" style={{ fontWeight: 700 }}>report it</Link> and the seller&rsquo;s
              listing is frozen while compliance investigates.
            </Banner>
          )}
        </div>
      )}

      <p className="small muted" style={{ marginTop: "var(--sp-4)" }}>
        Verification covers publicly listed products only. A regulated batch can only appear here
        if its Certificate of Analysis was approved before the listing went live — there is no
        override (A2).
      </p>
    </div>
  );
}
