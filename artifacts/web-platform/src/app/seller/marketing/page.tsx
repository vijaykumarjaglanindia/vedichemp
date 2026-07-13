/**
 * VEDIC HEMP — MARKETING (§2.8 adjacent)
 *
 * Coupons, bundles and flash sales. Any promotional copy touching a
 * regulated class (CBD Wellness) passes an automated compliance copy-check
 * before it can go live — no disease claims, no medical language. Campaign
 * surfaces are always visibly labelled via CampaignLabel.
 */

import type { Metadata } from "next";
import { TicketPercent, Boxes, Zap, SpellCheck2, Plus } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus } from "@/components/ui";
import { CampaignLabel } from "@/components/ui/ads";
import { COUPONS, BUNDLES, FLASH_SALES } from "../_lib/data";

export const metadata: Metadata = { title: "Marketing" };

export default function MarketingPage() {
  return (
    <Shell
      active="/seller/marketing"
      breadcrumb={["Seller Central", "Marketing"]}
      title="Marketing"
      actions={
        <button className="vh-btn vh-btn-sm vh-btn-primary" type="button" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} strokeWidth={2.2} aria-hidden /> Create coupon
        </button>
      }
    >
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

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        {/* Bundle builder teaser */}
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><Boxes size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /> Bundles</span>}
          action={<button className="vh-btn vh-btn-sm vh-btn-ghost" type="button">Open bundle builder</button>}
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
          action={<button className="vh-btn vh-btn-sm vh-btn-ghost" type="button">Schedule flash sale</button>}
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
