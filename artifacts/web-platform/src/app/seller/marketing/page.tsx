/**
 * VEDIC HEMP — MARKETING (§2.8 adjacent)
 *
 * Coupons, bundles and flash sales. Any promotional copy touching a
 * regulated class (CBD Wellness) passes an automated compliance copy-check
 * before it can go live — no disease claims, no medical language. Campaign
 * surfaces are always visibly labelled via CampaignLabel.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { TicketPercent, Boxes, Zap, SpellCheck2, Plus } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, StatusPill, toneForStatus } from "@/components/ui";
import { CampaignLabel } from "@/components/ui/ads";
import { readCoupons } from "@/lib/engage";
import { COUPONS, BUNDLES, FLASH_SALES } from "../_lib/data";
import { createCoupon } from "../actions";

export const metadata: Metadata = { title: "Marketing" };

const COUPON_ERRORS: Record<string, string> = {
  code: "Coupon code should be 4–12 letters/digits (e.g. VEDIC10).",
  pct: "Discount must be between 1% and 40%.",
};

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; err?: string }>;
}) {
  const { created, err } = await searchParams;
  const mine = await readCoupons();
  return (
    <Shell
      active="/seller/marketing"
      breadcrumb={["Seller Central", "Marketing"]}
      title="Marketing"
      actions={
        <a className="vh-btn vh-btn-sm vh-btn-primary" href="#new-coupon" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} strokeWidth={2.2} aria-hidden /> Create coupon
        </a>
      }
    >
      {created && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="Coupon created">It&rsquo;s active immediately and always applied server-side at checkout.</Banner>
        </div>
      )}
      {err && COUPON_ERRORS[err] && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger" title="Coupon not created">{COUPON_ERRORS[err]}</Banner>
        </div>
      )}
      {/* Copy-check note — kept */}
      <div className="vh-row" role="status" style={{ alignItems: "flex-start", gap: 10, border: "1px solid var(--vh-line)", borderLeft: "3px solid var(--vh-info)", borderRadius: "var(--vh-radius-sm)", padding: "12px 14px", background: "color-mix(in srgb, var(--vh-info-bg) 45%, var(--vh-surface))", marginBottom: "var(--sp-4)" }}>
        <SpellCheck2 size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-info)", marginTop: 2, flexShrink: 0 }} />
        <div className="small">
          <strong>Compliance copy-check.</strong> Promotional copy for CBD Wellness listings is scanned before
          publishing. Disease claims, medical language and &ldquo;cure&rdquo;/&ldquo;treat&rdquo; framing are rejected
          automatically (Drugs &amp; Magic Remedies Act) — coupons and creatives fail closed on a copy-check error.
        </div>
      </div>

      {/* Coupon cards */}
      <div className="vh-row" style={{ gap: 8, marginBottom: 8 }}>
        <TicketPercent size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} />
        <h3 style={{ margin: 0 }}>Coupons</h3>
      </div>
      <div className="vh-grid cols-3" style={{ marginBottom: "var(--sp-4)" }}>
        {mine.map((c) => (
          <Card key={c.code}>
            <div className="vh-row-between" style={{ marginBottom: 8 }}>
              <CampaignLabel>Coupon</CampaignLabel>
              <StatusPill tone={toneForStatus(c.status)}>{c.status}</StatusPill>
            </div>
            <div className="mono" style={{ fontWeight: 800, fontSize: "1.2rem", letterSpacing: ".04em" }}>{c.code}</div>
            <div className="small" style={{ marginTop: 4 }}>Percentage · <strong>{c.pct}% off</strong></div>
            <div className="small muted" style={{ marginTop: 2 }}>Storewide · created this session</div>
            <div className="vh-row-between" style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--vh-line)" }}>
              <span className="small muted">Redemptions</span>
              <span className="tabular" style={{ fontWeight: 700 }}>0</span>
            </div>
          </Card>
        ))}
        {COUPONS.map((c) => (
          <Card key={c.code}>
            <div className="vh-row-between" style={{ marginBottom: 8 }}>
              <CampaignLabel>Coupon</CampaignLabel>
              <StatusPill tone={toneForStatus(c.status)}>{c.status}</StatusPill>
            </div>
            <div className="mono" style={{ fontWeight: 800, fontSize: "1.2rem", letterSpacing: ".04em" }}>{c.code}</div>
            <div className="small" style={{ marginTop: 4 }}>{c.type} · <strong>{c.value}</strong></div>
            <div className="small muted" style={{ marginTop: 2 }}>{c.scope}</div>
            <div className="vh-row-between" style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--vh-line)" }}>
              <span className="small muted">Redemptions</span>
              <span className="tabular" style={{ fontWeight: 700 }}>{c.redemptions}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* New coupon */}
      <div id="new-coupon" style={{ scrollMarginTop: 90, marginBottom: "var(--sp-4)" }}>
        <Card title="Create coupon">
          <form action={createCoupon} className="vh-row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="vh-field" style={{ minWidth: 180 }}>
              <label className="vh-label" htmlFor="coupon-code">Code <span className="req">*</span></label>
              <input className="vh-input mono" id="coupon-code" name="code" required minLength={4} maxLength={12} placeholder="MONSOON15" style={{ textTransform: "uppercase" }} />
            </div>
            <div className="vh-field" style={{ width: 140 }}>
              <label className="vh-label" htmlFor="coupon-pct">Discount % <span className="req">*</span></label>
              <input className="vh-input" id="coupon-pct" name="pct" type="number" min={1} max={40} required placeholder="15" />
            </div>
            <button type="submit" className="vh-btn vh-btn-primary">Create</button>
            <span className="vh-help" style={{ flexBasis: "100%" }}>
              Applied server-side at checkout — a stale client price never wins. Copy in the coupon banner
              passes the compliance copy-check before display.
            </span>
          </form>
        </Card>
      </div>

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        {/* Bundle builder teaser */}
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><Boxes size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /> Bundles</span>}
          action={<Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/seller/products">Open bundle builder</Link>}
        >
          {BUNDLES.map((b, i) => (
            <div key={i} className="vh-row-between" style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: 12, marginBottom: 12 }}>
              <span>
                <CampaignLabel>Bundle</CampaignLabel>
                <div style={{ fontWeight: 600, marginTop: 6 }}>{b.name}</div>
                <div className="small muted">{b.products.join(" + ")}</div>
              </span>
              <StatusPill tone={toneForStatus(b.status)}>{b.status}</StatusPill>
            </div>
          ))}
          <div className="vh-dropzone" style={{ padding: "var(--sp-4)" }}>
            <Boxes size={18} strokeWidth={2.2} aria-hidden style={{ marginBottom: 6 }} />
            <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--vh-ink)" }}>Build your next bundle</div>
            <div className="small" style={{ marginTop: 4 }}>
              Pair a hero product with a companion SKU — bundles ship with one label and settle as one line. Only
              sellable batches (approved CoA, A2) can join a bundle.
            </div>
          </div>
        </Card>

        {/* Flash sales */}
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><Zap size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /> Flash sales</span>}
          action={<a className="vh-btn vh-btn-sm vh-btn-ghost" href="mailto:sellers@vedichemp.com?subject=Flash%20sale%20slot%20request" title="Flash-sale windows are platform campaigns — request a slot from marketplace marketing">Request a slot</a>}
        >
          {FLASH_SALES.length === 0 ? (
            <div className="vh-empty">No flash sales scheduled.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {FLASH_SALES.map((f, i) => (
                <li key={i} className="vh-row-between" style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: 12 }}>
                  <span>
                    <CampaignLabel>Flash sale</CampaignLabel>
                    <div style={{ fontWeight: 600, marginTop: 6 }}>{f.name}</div>
                    <div className="small muted">{f.window} · {f.discount}</div>
                  </span>
                  <StatusPill tone={toneForStatus(f.status)}>{f.status}</StatusPill>
                </li>
              ))}
            </ul>
          )}
          <p className="small muted" style={{ margin: "12px 0 0" }}>
            Flash-sale pricing is still server-computed at checkout — a stale client price never wins.
          </p>
        </Card>
      </div>
    </Shell>
  );
}
