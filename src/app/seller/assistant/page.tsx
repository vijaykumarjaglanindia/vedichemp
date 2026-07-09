/**
 * VEDIC HEMP — AI SELLER ASSISTANT (§2.4/2.6 adjacent)
 *
 * Every output here is a suggestion, not an action — nothing it writes is
 * treated as authoritative. Any generated listing copy still runs through
 * the same compliance copy-check as manually written copy before it can
 * publish (no disease claims, no medical framing on regulated classes).
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, Banner, MoneyText } from "@/components/ui";

export const metadata: Metadata = { title: "AI Assistant" };

export default function AssistantPage() {
  return (
    <Shell active="/seller/assistant" breadcrumb={["Seller Central", "AI Assistant"]} title="AI Seller Assistant">
      <Banner severity="info" title="Suggestions, not decisions" icon="✨">
        Every panel below produces a suggestion for you to review and edit. Generated copy for regulated classes still
        passes the compliance copy-check before it can publish — the assistant cannot bypass A2/A1 gates.
      </Banner>

      <div style={{ height: 16 }} />

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <Card title="✍️ Description writer">
          <p className="small muted" style={{ marginTop: 0 }}>Draft for: CBD Wellness Balm 30g</p>
          <div style={{ border: "1px solid var(--vh-line)", borderRadius: 8, padding: 12, fontSize: "0.88rem", background: "var(--vh-bg)" }}>
            &ldquo;A cooling topical balm formulated with broad-spectrum hemp extract, blended with eucalyptus and
            camphor for everyday muscle and joint comfort. Lab-tested every batch. For external use only.&rdquo;
          </div>
          <div className="small muted" style={{ marginTop: 8 }}>Copy-check: no disease claims detected · passed</div>
          <div className="vh-row" style={{ gap: 8, marginTop: 10 }}>
            <button className="vh-btn vh-btn-sm vh-btn-primary" type="button">Use this draft</button>
            <button className="vh-btn vh-btn-sm vh-btn-ghost" type="button">Regenerate</button>
          </div>
        </Card>

        <Card title="💵 Pricing suggestion">
          <p className="small muted" style={{ marginTop: 0 }}>CBD Ayurvedic Tincture 10ml</p>
          <div className="vh-row-between" style={{ marginBottom: 6 }}>
            <span className="small muted">Current price</span>
            <MoneyText paise={249900} />
          </div>
          <div className="vh-row-between" style={{ marginBottom: 6 }}>
            <span className="small muted">Suggested price</span>
            <MoneyText paise={239900} />
          </div>
          <div className="small muted">Based on category demand and 3 comparable buy-box winners. Final price is always seller-set — this is a suggestion, never applied automatically.</div>
          <button className="vh-btn vh-btn-sm vh-btn-primary" type="button" style={{ marginTop: 10 }}>Apply to listing</button>
        </Card>

        <Card title="📦 Inventory forecast">
          <p className="small muted" style={{ marginTop: 0 }}>Batch VB-2405 · CBD Wellness Balm 30g</p>
          <div className="small">Projected stockout in <strong>9 days</strong> at current sell-through.</div>
          <div className="small muted" style={{ marginTop: 6 }}>Suggest reordering 150 units to maintain 30 days of cover.</div>
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href="/seller/inventory" style={{ marginTop: 10, display: "inline-block" }}>Review inventory →</a>
        </Card>

        <Card title="📈 Sales forecast">
          <p className="small muted" style={{ marginTop: 0 }}>Next 30 days, all listings</p>
          <div className="small">Projected GMV: <strong><MoneyText paise={21_40_000_00} /></strong> (+6% vs trailing 30 days)</div>
          <div className="small muted" style={{ marginTop: 6 }}>Driven mainly by CBD Wellness Balm and Roll-On seasonal demand.</div>
        </Card>
      </div>
    </Shell>
  );
}
