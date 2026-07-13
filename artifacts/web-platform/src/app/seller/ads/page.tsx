/**
 * VEDIC HEMP — VEDIC ADS MANAGER (§2.8, full campaign structure)
 *
 * Campaign → ad group → keywords / ads / placements, in the shape of the
 * big ad platforms: budgets (daily + total), schedule, location targeting,
 * placements and a bid strategy per campaign. The auction ranks by
 * bid × listing quality and rotates proportionally, so every advertiser
 * earns share of voice — see lib/ads.ts.
 *
 * A1 is enforced at three independent layers (this UI/API, the review
 * queue, the auction), and the claims rule is highlighted right here:
 * NO LISTING MAY MAKE MEDICAL CLAIMS, and a listing that attempted claims
 * copy is barred from advertising until compliance clears it.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Ban, Megaphone, MousePointerClick, Eye, TrendingUp, Plus, ShieldAlert } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, DataTable, StatusPill, toneForStatus, MoneyText, type Column } from "@/components/ui";
import { AdSlot, SponsoredLabel } from "@/components/ui/ads";
import { getSession } from "@/lib/auth-lite";
import { adEligibility, AD_LOCATIONS, BID_STRATEGIES, listCampaigns, PLACEMENTS, qualityScore, type Campaign } from "@/lib/ads";
import { sellerListings } from "@/lib/catalog";
import { AD_PLACEMENTS } from "../_lib/data";
import { CLASS_META } from "@/lib/compliance";
import { createCampaign } from "../actions";

export const metadata: Metadata = { title: "Vedic Ads" };

const CAMPAIGN_ERRORS: Record<string, string> = {
  name: "Campaign name should be 4–60 characters.",
  type: "Pick a campaign type.",
  product: "Pick the product to promote.",
  a1: "That product's class cannot be advertised — the request was rejected and logged (A1).",
  strike: "That listing attempted medical-claims copy and is barred from advertising until compliance clears it.",
  budget: "Budget must be at least ₹500.",
};

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; err?: string }>;
}) {
  const { created, err } = await searchParams;
  const session = await getSession();
  const campaigns = await listCampaigns(session?.email ?? "seller@example.in");
  const listings = await sellerListings(session?.email ?? "seller@example.in", "Vedic Botanicals");

  const totals = campaigns.reduce(
    (t, c) => ({ imp: t.imp + c.impressions, clicks: t.clicks + c.clicks, spend: t.spend + c.spentPaise }),
    { imp: 0, clicks: 0, spend: 0 },
  );
  const ctr = totals.imp ? ((totals.clicks / totals.imp) * 100).toFixed(1) : "0.0";

  const columns: Column<Campaign>[] = [
    {
      key: "name", header: "Campaign", render: (c) => (
        <div>
          <div style={{ fontWeight: 600 }}><Link href={`/seller/ads/${c.id}`}>{c.name}</Link></div>
          <div className="small muted">
            {c.objective.replace(/_/g, " ").toLowerCase()} · {c.adGroups.length} ad group{c.adGroups.length === 1 ? "" : "s"} ·{" "}
            {c.locations.includes("ALL") ? "All India" : c.locations.join(", ")}
          </div>
        </div>
      ),
    },
    { key: "budget", header: "Daily / total", align: "right", render: (c) => (
        <span className="small tabular"><MoneyText paise={c.dailyBudgetPaise} /> / <MoneyText paise={c.totalBudgetPaise} /></span>
      ) },
    { key: "spend", header: "Spend", align: "right", render: (c) => <MoneyText paise={c.spentPaise} /> },
    { key: "imp", header: "Impr.", align: "right", render: (c) => <span className="tabular">{c.impressions}</span> },
    { key: "clicks", header: "Clicks", align: "right", render: (c) => <span className="tabular">{c.clicks}</span> },
    { key: "status", header: "Status", render: (c) => <StatusPill tone={toneForStatus(c.status)}>{c.status.replace(/_/g, " ")}</StatusPill> },
    { key: "manage", header: "", align: "right", render: (c) => (
        <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/seller/ads/${c.id}`}>Manage</Link>
      ) },
  ];

  return (
    <Shell
      active="/seller/ads"
      breadcrumb={["Seller Central", "Vedic Ads"]}
      title="Vedic Ads"
      actions={
        <a className="vh-btn vh-btn-sm vh-btn-primary" href="#new-campaign" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} strokeWidth={2.2} aria-hidden /> Create campaign
        </a>
      }
    >
      {/* THE rule, highlighted where advertising starts */}
      <div style={{ marginBottom: "var(--sp-3)" }}>
        <Banner severity="warn" title="No listing may make medical claims — and flagged listings cannot advertise">
          Listing copy, ad headlines and AI-generated text all pass the same server-side claims check
          (no cure / treat / prevent / diagnose). A listing that attempted claims copy is flagged and
          barred from every campaign until compliance clears it.
        </Banner>
      </div>

      {created && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="Campaign created — creative in review">
            Every creative is human-reviewed before it serves. The campaign goes ACTIVE on approval and
            every paid impression renders behind a visible Sponsored label.
          </Banner>
        </div>
      )}
      {err && CAMPAIGN_ERRORS[err] && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger" title="Campaign not created">{CAMPAIGN_ERRORS[err]}</Banner>
        </div>
      )}

      {/* Account summary (live counters from the auction) */}
      <div className="vh-grid cols-4" style={{ marginBottom: "var(--sp-4)" }}>
        <Card>
          <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><Eye size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">Impressions</span></div>
          <div className="vh-stat-value tabular">{totals.imp.toLocaleString("en-IN")}</div>
        </Card>
        <Card>
          <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><MousePointerClick size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">Clicks</span></div>
          <div className="vh-stat-value tabular">{totals.clicks.toLocaleString("en-IN")}</div>
        </Card>
        <Card>
          <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><Megaphone size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">CTR</span></div>
          <div className="vh-stat-value tabular">{ctr}%</div>
        </Card>
        <Card>
          <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><TrendingUp size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">Spend</span></div>
          <div className="vh-stat-value tabular"><MoneyText paise={totals.spend} /></div>
        </Card>
      </div>

      <Card title="Campaigns" pad0>
        <DataTable columns={columns} rows={campaigns} empty={<div className="vh-empty">No campaigns yet — create your first campaign below.</div>} />
      </Card>

      <div style={{ height: "var(--sp-4)" }} />

      {/* New campaign — every setting on one form; A1: only ad-eligible
          products are offered, and the action re-validates server-side. */}
      <div id="new-campaign" style={{ scrollMarginTop: 90, marginBottom: "var(--sp-4)" }}>
        <Card title="Create campaign">
          <form action={createCampaign} className="vh-grid" style={{ gap: 16 }}>
            <div className="vh-grid cols-2" style={{ gap: 16 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-name">Campaign name <span className="req">*</span></label>
                <input className="vh-input" id="camp-name" name="name" required minLength={4} maxLength={60} placeholder="e.g. Monsoon Balm Push" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-type">Objective <span className="req">*</span></label>
                <select className="vh-select" id="camp-type" name="type" defaultValue="Sponsored Product" required>
                  <option>Sponsored Product</option>
                  <option>Banner</option>
                  <option>Video</option>
                </select>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-product">Product <span className="req">*</span></label>
                <select className="vh-select" id="camp-product" name="productId" required defaultValue="">
                  <option value="" disabled>Choose a product…</option>
                  {listings.map((p) => {
                    const elig = adEligibility(p);
                    const label = elig.ok
                      ? `${p.title} · quality ${qualityScore(p)}/10`
                      : `${p.title} · ${elig.reason === "strike" ? "AD-BARRED (claims attempt)" : elig.reason === "state" ? "not LIVE" : elig.reason === "coa" ? "CoA pending (A2)" : "not advertisable (A1)"}`;
                    return (
                      <option key={p.id} value={p.id} disabled={!elig.ok}>{label}</option>
                    );
                  })}
                </select>
                <span className="vh-help">
                  Medical Cannabis never appears (A1). Listings flagged for attempted claims copy show as
                  AD-BARRED until compliance clears them. Quality score feeds the auction.
                </span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-budget">Total budget (₹) <span className="req">*</span></label>
                <input className="vh-input" id="camp-budget" name="budget" type="number" min={500} step={1} required placeholder="5000" />
                <span className="vh-help">Minimum ₹500 · the campaign ends automatically at 100% of budget.</span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-daily">Daily budget (₹)</label>
                <input className="vh-input" id="camp-daily" name="dailyBudget" type="number" min={100} step={1} placeholder="500" />
                <span className="vh-help">Serving pauses for the day once daily spend is reached.</span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-bid">Default bid (₹ per click)</label>
                <input className="vh-input" id="camp-bid" name="bid" type="number" min={2} step={1} placeholder="9" />
                <span className="vh-help">You pay the second price — just enough to beat the runner-up, never more than your bid.</span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-strategy">Bid strategy</label>
                <select className="vh-select" id="camp-strategy" name="bidStrategy" defaultValue="MANUAL_CPC">
                  {BID_STRATEGIES.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                </select>
                <span className="vh-help">{BID_STRATEGIES.map((b) => `${b.label}: ${b.help}`).join(" ")}</span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-acos">Target ACoS % (for Target-ACoS strategy)</label>
                <input className="vh-input" id="camp-acos" name="targetAcos" type="number" min={1} max={100} step={1} placeholder="15" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-start">Start date</label>
                <input className="vh-input" id="camp-start" name="startDate" type="date" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-end">End date (optional)</label>
                <input className="vh-input" id="camp-end" name="endDate" type="date" />
              </div>
            </div>

            <div className="vh-field">
              <span className="vh-label">Locations</span>
              <div className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                {AD_LOCATIONS.map((l) => (
                  <label key={l.code} className="vh-row small" style={{ gap: 5 }}>
                    <input type="checkbox" name="locations" value={l.code} defaultChecked={l.code === "ALL"} /> {l.label}
                  </label>
                ))}
              </div>
              <span className="vh-help">Ads serve only to buyers in the selected states (All India overrides the rest).</span>
            </div>

            <div className="vh-field">
              <span className="vh-label">Placements</span>
              <div className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                {PLACEMENTS.map((p) => (
                  <label key={p.key} className="vh-row small" style={{ gap: 5 }}>
                    <input
                      type="checkbox" name="placements" value={p.key}
                      defaultChecked={["listing-sponsored", "home-sponsored-products", "listing-sidebar"].includes(p.key)}
                    />
                    {p.label} <span className="muted">(floor <MoneyText paise={p.floorPaise} />)</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="vh-btn vh-btn-primary" style={{ justifySelf: "start" }}>
              Submit for creative review
            </button>
          </form>
        </Card>
      </div>

      <div className="vh-grid cols-2" style={{ alignItems: "start", marginBottom: "var(--sp-4)" }}>
        {/* How the auction picks a winner */}
        <Card title="How the auction works">
          <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
            <li><strong>Rank = your bid × listing quality (1–10).</strong> Rating, an approved lab report and a real discount lift quality — money alone can&rsquo;t buy the slot.</li>
            <li><strong>Second-price billing.</strong> A click costs just enough to beat the runner-up, never more than your bid.</li>
            <li><strong>Fair rotation.</strong> Impressions are shared in proportion to rank, so every eligible advertiser gets seen — not only the top bidder.</li>
            <li><strong>Keywords.</strong> Broad, phrase and exact match with per-keyword bids and negatives; each keyword shows its estimated daily impressions when you add it.</li>
          </ul>
        </Card>

        {/* A1 lock — elevated, distinct */}
        <div
          role="note"
          aria-label="Medical Cannabis advertising prohibition"
          style={{
            border: "1px solid var(--vh-danger)",
            borderRadius: "var(--vh-radius)",
            background: "color-mix(in srgb, var(--vh-danger-bg) 55%, var(--vh-surface))",
            padding: "var(--sp-4)",
          }}
        >
          <div className="vh-row" style={{ gap: 10, marginBottom: 8 }}>
            <Ban size={20} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-danger)", flexShrink: 0 }} />
            <h3 style={{ margin: 0, color: "var(--vh-danger)" }}>Medical Cannabis — advertising prohibited by law</h3>
          </div>
          <p className="small" style={{ margin: "0 0 8px" }}>
            Prohibited under the <strong>Drugs &amp; Magic Remedies (Objectionable Advertisements) Act, 1954</strong>{" "}
            and platform prohibition <strong>A1</strong>. No licence, spend level or account tier changes this.
          </p>
          <p className="small" style={{ margin: "0 0 8px" }}>
            Enforced at three independent layers: <strong>(1)</strong> this builder and its API reject the class,{" "}
            <strong>(2)</strong> the review queue cannot approve it, and <strong>(3)</strong> the auction drops any
            such candidate with a logged violation. There is no override endpoint at any layer.
          </p>
          <span className="vh-row small" style={{ gap: 6, color: "var(--vh-danger)", fontWeight: 700 }}>
            <ShieldAlert size={14} strokeWidth={2.2} aria-hidden /> Claims-flagged listings are equally barred until cleared.
          </span>
        </div>
      </div>

      {/* Placement inventory */}
      <Card
        title="Placement inventory"
        action={<span className="small muted">Floors &amp; switches configured in Admin → Ads</span>}
      >
        <div className="vh-grid cols-2" style={{ gap: "var(--sp-3)" }}>
          {AD_PLACEMENTS.map((p) => (
            <div key={p.key} style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius)", padding: 16 }}>
              <div className="vh-row-between" style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 700 }}>{p.name}</span>
                <span className="small tabular" style={{ fontWeight: 700 }}>
                  est. <MoneyText paise={p.estCpcPaise} /> <span className="muted">/{p.pricing === "CPC" ? "click" : "1k views"}</span>
                </span>
              </div>
              <p className="small muted" style={{ margin: "0 0 12px" }}>{p.blurb}</p>
              <AdSlot cls={p.exampleCls} placement={p.name}>
                <div className="vh-row" style={{ gap: 12 }}>
                  <span aria-hidden style={{ fontSize: "1.8rem" }}>{p.exampleEmoji}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{p.exampleTitle}</div>
                    <div className="small muted">{CLASS_META[p.exampleCls].short} · example creative</div>
                  </div>
                </div>
              </AdSlot>
            </div>
          ))}
        </div>
        <p className="small muted" style={{ margin: "12px 0 0" }}>
          Every paid surface renders through <span className="mono">AdSlot</span> and is always labelled{" "}
          <SponsoredLabel /> — there is no unlabelled variant, and the component itself throws on a MED_CANNABIS
          creative (A1 render guard).
        </p>
      </Card>
    </Shell>
  );
}
