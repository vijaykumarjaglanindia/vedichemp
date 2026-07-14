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
import { Ban, Megaphone, MousePointerClick, Eye, TrendingUp, Plus, ShieldAlert, Lightbulb, IndianRupee } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, DataTable, StatusPill, toneForStatus, MoneyText, type Column } from "@/components/ui";
import { AdSlot, SponsoredLabel } from "@/components/ui/ads";
import { getSession } from "@/lib/auth-lite";
import { accountResults, adEligibility, adIdeas, AD_LOCATIONS, BID_STRATEGIES, campaignResults, listCampaigns, PLACEMENTS, qualityScore, type Campaign } from "@/lib/ads";
import { sellerListings } from "@/lib/catalog";
import { AD_PLACEMENTS } from "../_lib/data";
import { CLASS_META } from "@/lib/compliance";
import { createCampaign } from "../actions";

export const metadata: Metadata = { title: "Vedic Ads" };

const CAMPAIGN_ERRORS: Record<string, string> = {
  name: "Give your ad a name between 4 and 60 letters.",
  type: "Pick an ad type.",
  product: "Choose which product to promote.",
  a1: "That product can't be advertised by law — the request was blocked and recorded.",
  strike: "That product was flagged for a medical claim. It can't be advertised until our team clears it.",
  budget: "Your total budget needs to be at least ₹500.",
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

  const results = accountResults(campaigns);
  const ideas = adIdeas(campaigns);
  const STATUS_WORDS: Record<string, string> = {
    IN_REVIEW: "Being checked", ACTIVE: "Running", PAUSED: "Paused", ENDED: "Finished", REJECTED: "Not approved",
  };

  const columns: Column<Campaign>[] = [
    {
      key: "name", header: "Ad campaign", render: (c) => (
        <div>
          <div style={{ fontWeight: 600 }}><Link href={`/seller/ads/${c.id}`}>{c.name}</Link></div>
          <div className="small muted">
            {c.locations.includes("ALL") ? "All India" : c.locations.join(", ")} · budget{" "}
            <MoneyText paise={c.dailyBudgetPaise} />/day
          </div>
        </div>
      ),
    },
    { key: "shown", header: "Times shown", align: "right", render: (c) => <span className="tabular">{c.impressions.toLocaleString("en-IN")}</span> },
    { key: "visits", header: "Visits", align: "right", render: (c) => <span className="tabular">{c.clicks.toLocaleString("en-IN")}</span> },
    { key: "spend", header: "Money spent", align: "right", render: (c) => <MoneyText paise={c.spentPaise} /> },
    { key: "sales", header: "Sales from ads", align: "right", render: (c) => <MoneyText paise={c.salesPaise} /> },
    { key: "return", header: "Return", align: "right", render: (c) => {
        const r = campaignResults(c);
        return <span className="tabular">{r.returnPerRupee > 0 ? `₹${r.returnPerRupee.toFixed(2)}` : "—"}</span>;
      } },
    { key: "status", header: "Status", render: (c) => <StatusPill tone={toneForStatus(c.status)}>{STATUS_WORDS[c.status] ?? c.status}</StatusPill> },
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
          <Plus size={14} strokeWidth={2.2} aria-hidden /> Create a new ad
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
          <Banner severity="ok" title="Ad created — our team is checking it">
            We review every ad before it goes live. Once it&rsquo;s approved it starts showing to shoppers, always
            with a clear &ldquo;Sponsored&rdquo; label so buyers know it&rsquo;s an ad.
          </Banner>
        </div>
      )}
      {err && CAMPAIGN_ERRORS[err] && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger" title="Campaign not created">{CAMPAIGN_ERRORS[err]}</Banner>
        </div>
      )}

      {/* Plain-language results — what your ads did, in normal words */}
      <div className="vh-grid cols-4" style={{ marginBottom: "var(--sp-3)" }}>
        <Card>
          <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><Eye size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">Times shown</span></div>
          <div className="vh-stat-value tabular">{results.shown.toLocaleString("en-IN")}</div>
          <div className="small muted">how often shoppers saw your ads</div>
        </Card>
        <Card>
          <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><MousePointerClick size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">Visits</span></div>
          <div className="vh-stat-value tabular">{results.visits.toLocaleString("en-IN")}</div>
          <div className="small muted">shoppers who clicked to your product</div>
        </Card>
        <Card>
          <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><IndianRupee size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">Money spent</span></div>
          <div className="vh-stat-value tabular"><MoneyText paise={results.spentPaise} /></div>
          <div className="small muted">you only pay when someone clicks</div>
        </Card>
        <Card>
          <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><TrendingUp size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">Sales from ads</span></div>
          <div className="vh-stat-value tabular"><MoneyText paise={results.salesPaise} /></div>
          <div className="small muted">
            {results.returnPerRupee > 0
              ? `every ₹1 spent brought back ₹${results.returnPerRupee.toFixed(2)}`
              : "sales that started from an ad click"}
          </div>
        </Card>
      </div>

      {/* Ideas to improve — plain, actionable, no jargon */}
      <div style={{ marginBottom: "var(--sp-4)" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><Lightbulb size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} /> Ideas to improve your ads</span>}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {ideas.map((idea, i) => (
              <li key={i} className="vh-row" style={{ gap: 10, alignItems: "flex-start" }}>
                <StatusPill tone={idea.tone === "warn" ? "warn" : idea.tone === "ok" ? "ok" : "info"}>
                  {idea.tone === "warn" ? "Fix" : idea.tone === "ok" ? "Good" : "Tip"}
                </StatusPill>
                <span className="small">{idea.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Your ad campaigns" pad0>
        <DataTable columns={columns} rows={campaigns} empty={<div className="vh-empty">No ads yet — create your first one below to start showing your products to more shoppers.</div>} />
      </Card>

      <div style={{ height: "var(--sp-4)" }} />

      {/* New campaign — every setting on one form; A1: only ad-eligible
          products are offered, and the action re-validates server-side. */}
      <div id="new-campaign" style={{ scrollMarginTop: 90, marginBottom: "var(--sp-4)" }}>
        <Card title="Create a new ad">
          <p className="small muted" style={{ margin: "0 0 12px" }}>
            Promote one of your products so more shoppers see it. You choose a budget and only pay when someone clicks.
          </p>
          <form action={createCampaign} className="vh-grid" style={{ gap: 16 }}>
            <div className="vh-grid cols-2" style={{ gap: 16 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-name">Give this ad a name <span className="req">*</span></label>
                <input className="vh-input" id="camp-name" name="name" required minLength={4} maxLength={60} placeholder="e.g. Monsoon balm offer" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-type">Ad type <span className="req">*</span></label>
                <select className="vh-select" id="camp-type" name="type" defaultValue="Sponsored Product" required>
                  <option value="Sponsored Product">Promoted product (in search &amp; listings)</option>
                  <option value="Banner">Banner image</option>
                  <option value="Video">Video</option>
                </select>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-product">Which product? <span className="req">*</span></label>
                <select className="vh-select" id="camp-product" name="productId" required defaultValue="">
                  <option value="" disabled>Choose a product…</option>
                  {listings.map((p) => {
                    const elig = adEligibility(p);
                    const label = elig.ok
                      ? `${p.title} · quality ${qualityScore(p)}/10`
                      : `${p.title} · ${elig.reason === "strike" ? "can't advertise (medical claim)" : elig.reason === "state" ? "not on sale yet" : elig.reason === "coa" ? "lab report pending" : "not allowed"}`;
                    return (
                      <option key={p.id} value={p.id} disabled={!elig.ok}>{label}</option>
                    );
                  })}
                </select>
                <span className="vh-help">
                  A higher &ldquo;quality&rdquo; product (good rating, lab-tested, a real discount) shows higher without you paying more.
                  Products flagged for a medical claim can&rsquo;t be advertised until our team clears them.
                </span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-budget">Total budget (₹) <span className="req">*</span></label>
                <input className="vh-input" id="camp-budget" name="budget" type="number" min={500} step={1} required placeholder="5000" />
                <span className="vh-help">At least ₹500. The ad stops on its own once this is used up.</span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-daily">Budget per day (₹)</label>
                <input className="vh-input" id="camp-daily" name="dailyBudget" type="number" min={100} step={1} placeholder="500" />
                <span className="vh-help">Your ad pauses for the rest of the day once this is used, then starts again tomorrow.</span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-bid">Most you&rsquo;ll pay per click (₹)</label>
                <input className="vh-input" id="camp-bid" name="bid" type="number" min={2} step={1} placeholder="9" />
                <span className="vh-help">You usually pay less than this — just a little more than the next advertiser.</span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-strategy">Bidding style</label>
                <select className="vh-select" id="camp-strategy" name="bidStrategy" defaultValue="MANUAL_CPC">
                  {BID_STRATEGIES.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                </select>
                <span className="vh-help">{BID_STRATEGIES.map((b) => `${b.label}: ${b.help}`).join(" ")}</span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="camp-acos">Target ad cost (only for &ldquo;spend to hit a cost&rdquo;)</label>
                <input className="vh-input" id="camp-acos" name="targetAcos" type="number" min={1} max={100} step={1} placeholder="15" />
                <span className="vh-help">The share of each sale you&rsquo;re happy to spend on ads. E.g. 15 means ₹15 of ads per ₹100 of sales.</span>
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
              <span className="vh-label">Where should it show?</span>
              <div className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                {AD_LOCATIONS.map((l) => (
                  <label key={l.code} className="vh-row small" style={{ gap: 5 }}>
                    <input type="checkbox" name="locations" value={l.code} defaultChecked={l.code === "ALL"} /> {l.label}
                  </label>
                ))}
              </div>
              <span className="vh-help">Pick the states where shoppers should see your ad. &ldquo;All India&rdquo; shows everywhere.</span>
            </div>

            <div className="vh-field">
              <span className="vh-label">Where on the site?</span>
              <div className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                {PLACEMENTS.map((p) => (
                  <label key={p.key} className="vh-row small" style={{ gap: 5 }}>
                    <input
                      type="checkbox" name="placements" value={p.key}
                      defaultChecked={["listing-sponsored", "home-sponsored-products", "listing-sidebar"].includes(p.key)}
                    />
                    {p.label} <span className="muted">(from <MoneyText paise={p.floorPaise} />/click)</span>
                  </label>
                ))}
              </div>
              <span className="vh-help">Leave the common spots ticked if you&rsquo;re not sure — they reach the most shoppers.</span>
            </div>

            <button type="submit" className="vh-btn vh-btn-primary" style={{ justifySelf: "start" }}>
              Create ad — we&rsquo;ll review it
            </button>
          </form>
        </Card>
      </div>

      <div className="vh-grid cols-2" style={{ alignItems: "start", marginBottom: "var(--sp-4)" }}>
        {/* How we decide who shows first — plain words */}
        <Card title="How ads decide who shows first">
          <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
            <li><strong>Your bid and your product quality both matter.</strong> A good rating, a lab-tested badge and a real discount help you show higher — money alone doesn&rsquo;t win the top spot.</li>
            <li><strong>You never overpay.</strong> A click costs just a little more than the next advertiser&rsquo;s — never more than the most you said you&rsquo;d pay.</li>
            <li><strong>Everyone gets a turn.</strong> Space is shared fairly, so smaller sellers get seen too — not only the biggest spender.</li>
            <li><strong>Search words.</strong> Add the words shoppers type when looking for products like yours. You can also block words you don&rsquo;t want to show for. We show an estimate of how many shoppers each word reaches.</li>
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
        title="Where your ads can appear"
        action={<span className="small muted">Prices &amp; spots are set by the marketplace team</span>}
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
