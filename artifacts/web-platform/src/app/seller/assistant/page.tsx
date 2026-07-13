/**
 * VEDIC HEMP — AI SELLER ASSISTANT (§2.4/2.6 adjacent)
 *
 * Every output here is a suggestion, not an action — nothing it writes is
 * treated as authoritative. Any generated listing copy still runs through
 * the same compliance copy-check as manually written copy before it can
 * publish (no disease claims, no medical framing on regulated classes).
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sparkles, PenLine, BadgeIndianRupee, PackageSearch, TrendingUp, ShieldCheck } from "lucide-react";
import { Shell } from "../Shell";
import { Card, MoneyText } from "@/components/ui";
import { Columns } from "@/components/ui/charts";
import { FORECAST_4W } from "../_lib/data";

export const metadata: Metadata = { title: "AI Assistant" };

function SuggestionCard({
  icon, title, children,
}: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card>
      <div className="vh-row" style={{ gap: 10, marginBottom: 10 }}>
        <span aria-hidden style={{ display: "inline-flex", padding: 8, borderRadius: 10, background: "var(--vh-green-100)", color: "var(--vh-green-700)" }}>
          {icon}
        </span>
        <div>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <div className="small muted vh-row" style={{ gap: 4 }}>
            <Sparkles size={12} strokeWidth={2.2} aria-hidden /> AI suggestion — review before applying
          </div>
        </div>
      </div>
      {children}
    </Card>
  );
}

export default function AssistantPage() {
  return (
    <Shell active="/seller/assistant" breadcrumb={["Seller Central", "AI Assistant"]} title="AI Seller Assistant">
      {/* Disclaimer — outputs pass compliance copy-check */}
      <div className="vh-row" role="status" style={{ alignItems: "flex-start", gap: 10, border: "1px solid var(--vh-line)", borderLeft: "3px solid var(--vh-info)", borderRadius: "var(--vh-radius-sm)", padding: "12px 14px", background: "color-mix(in srgb, var(--vh-info-bg) 45%, var(--vh-surface))", marginBottom: "var(--sp-4)" }}>
        <ShieldCheck size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-info)", marginTop: 2, flexShrink: 0 }} />
        <div className="small">
          <strong>Suggestions, not decisions.</strong> Every panel below produces a suggestion for you to review and
          edit. Generated copy for regulated classes still passes the compliance copy-check before it can publish —
          the assistant cannot bypass the A2 CoA gate or the A1 advertising prohibition.
        </div>
      </div>

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <SuggestionCard icon={<PenLine size={16} strokeWidth={2.2} />} title="Description writer">
          <p className="small muted" style={{ marginTop: 0 }}>Draft for: CBD Wellness Balm 30g</p>
          <div style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: 12, fontSize: "0.88rem", background: "var(--vh-bg)" }}>
            &ldquo;A cooling topical balm formulated with broad-spectrum hemp extract, blended with eucalyptus and
            camphor for everyday muscle and joint comfort. Lab-tested every batch. For external use only.&rdquo;
          </div>
          <div className="small" style={{ marginTop: 8, color: "var(--vh-ok)", fontWeight: 600 }}>Copy-check: no disease claims detected · passed</div>
          <div className="vh-row" style={{ gap: 8, marginTop: 12 }}>
            <button className="vh-btn vh-btn-sm vh-btn-primary" type="button">Use this draft</button>
            <button className="vh-btn vh-btn-sm vh-btn-ghost" type="button">Regenerate</button>
          </div>
        </SuggestionCard>

        <SuggestionCard icon={<BadgeIndianRupee size={16} strokeWidth={2.2} />} title="Pricing suggestion">
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
          <button className="vh-btn vh-btn-sm vh-btn-primary" type="button" style={{ marginTop: 12 }}>Apply to listing</button>
        </SuggestionCard>

        <SuggestionCard icon={<PackageSearch size={16} strokeWidth={2.2} />} title="Inventory forecast">
          <p className="small muted" style={{ marginTop: 0 }}>Batch VB-2405 · CBD Wellness Balm 30g</p>
          <div className="small">Projected stockout in <strong>9 days</strong> at current sell-through.</div>
          <div className="small muted" style={{ marginTop: 6 }}>Suggest reordering 150 units to maintain 30 days of cover. A new batch needs its own approved CoA before it can sell (A2).</div>
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href="/seller/inventory" style={{ marginTop: 12, display: "inline-block" }}>Review inventory →</a>
        </SuggestionCard>

        <SuggestionCard icon={<TrendingUp size={16} strokeWidth={2.2} />} title="Sales forecast">
          <p className="small muted" style={{ marginTop: 0 }}>Next 4 weeks, all listings</p>
          <Columns values={FORECAST_4W.valuesPaise} labels={FORECAST_4W.labels} height={96} />
          <div className="small" style={{ marginTop: 12 }}>
            Projected GMV: <strong><MoneyText paise={FORECAST_4W.valuesPaise.reduce((s, v) => s + v, 0)} /></strong> (+6% vs trailing 30 days)
          </div>
          <div className="small muted" style={{ marginTop: 4 }}>Driven mainly by CBD Wellness Balm and Roll-On seasonal demand.</div>
        </SuggestionCard>
      </div>
    </Shell>
  );
}
