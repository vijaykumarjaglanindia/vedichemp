/**
 * VEDIC HEMP — CAMPAIGN DETAIL (ad groups, keywords, ads, placements)
 *
 * The working end of the ads module: edit every campaign setting, build ad
 * groups with default bids and placements, add keywords (broad/phrase/exact,
 * per-keyword bids, negatives) with live impression estimates, and create
 * creatives — with claims-gated AI assistance on the copy fields ("review
 * before applying", always labelled with the provider).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pause, Play, Plus, Sparkles } from "lucide-react";
import { Shell } from "../../Shell";
import { Banner, Card, MoneyText, StatusPill, toneForStatus } from "@/components/ui";
import { getSession } from "@/lib/auth-lite";
import { aiProviderName } from "@/lib/ai";
import { adEligibility, AD_LOCATIONS, BID_STRATEGIES, campaignResults, findCampaign, PLACEMENTS, qualityScore } from "@/lib/ads";
import { sellerListings } from "@/lib/catalog";
import {
  addKeywordToGroup, aiSuggestHeadline, aiSuggestKeywords, createAdCreative, createAdGroup,
  saveCampaignSettings, toggleCampaign,
} from "../../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = await findCampaign(id);
  return { title: c ? `${c.name} · Vedic Ads` : "Campaign" };
}

const ERRORS: Record<string, string> = {
  name: "Campaign name should be 4–60 characters.",
  budget: "Total budget must be at least ₹500.",
  daily: "Daily budget must be at least ₹100.",
  groupname: "Ad group name should be 3–50 characters.",
  bidfloor: "Default bid is below the platform floor — raise it.",
  placement: "Pick at least one placement for the ad group.",
  keyword: "Keyword should be 2–60 characters (duplicates are skipped).",
  headline: "Headline should be 8–90 characters.",
  claims: "The headline failed the claims copy-check (no cure/treat/prevent). Nothing with claims language serves — from anyone.",
  strike: "That listing is barred from advertising (attempted claims copy) until compliance clears it.",
  a1: "That class can never be advertised. The attempt was logged.",
  product: "That product can't be advertised right now (must be LIVE, CoA approved for regulated classes).",
  review: "The campaign needs at least one APPROVED creative before it can serve.",
};

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; err?: string; group?: string; kw?: string; est?: string; ad?: string; ai?: string; state?: string }>;
}) {
  const { id } = await params;
  const { saved, err, group, kw, est, ad, ai, state } = await searchParams;
  const c = await findCampaign(id);
  if (!c) notFound();

  const session = await getSession();
  const listings = await sellerListings(session?.email ?? "seller@example.in", "Vedic Botanicals");
  const eligible = listings.filter((p) => adEligibility(p).ok);
  const avgCpc = c!.clicks ? Math.round(c!.spentPaise / c!.clicks) : 0;
  const results = campaignResults(c!);
  const STATUS_WORDS: Record<string, string> = {
    IN_REVIEW: "Being checked", ACTIVE: "Running", PAUSED: "Paused", ENDED: "Finished", REJECTED: "Not approved",
  };

  return (
    <Shell
      active="/seller/ads"
      breadcrumb={["Seller Central", "Vedic Ads", c!.name]}
      title={c!.name}
      actions={
        <span className="vh-row" style={{ gap: 8 }}>
          <StatusPill tone={toneForStatus(c!.status)}>{STATUS_WORDS[c!.status] ?? c!.status}</StatusPill>
          <Link href="/seller/ads" className="vh-btn vh-btn-sm vh-btn-ghost vh-row" style={{ gap: 6 }}>
            <ArrowLeft size={14} strokeWidth={2.2} aria-hidden /> All my ads
          </Link>
        </span>
      }
    >
      {saved && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title="Campaign settings saved">Changes apply to the next auction.</Banner></div>}
      {group && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title="Ad group created">Add keywords and a creative below.</Banner></div>}
      {kw === "added" && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="Keyword added">
            Estimated impressions: about <strong>{parseInt(est ?? "0", 10).toLocaleString("en-IN")}/day</strong> at current traffic — actual impressions accrue live below.
          </Banner>
        </div>
      )}
      {kw === "negative" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title="Negative keyword added">Searches containing it will never trigger this ad group.</Banner></div>}
      {ad && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title="Creative submitted for review">A human reviews every creative before it serves — it will show IN REVIEW until approved in Admin → Ads.</Banner></div>}
      {ai && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title={`AI ${ai === "headline" ? "headline" : "keywords"} generated — review before applying`}>
            Generated by {aiProviderName()} and passed through the same claims copy-check as everything else.
            AI output that violated platform rules would be replaced with compliant copy — the rules outrank the model.
          </Banner>
        </div>
      )}
      {state && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title={state === "paused" ? "Campaign paused" : "Campaign resumed"}>{state === "paused" ? "It stops entering auctions immediately." : "It re-enters auctions immediately."}</Banner></div>}
      {err && ERRORS[err] && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="danger" title="That didn't go through">{ERRORS[err]}</Banner></div>}

      {/* Results — in plain words */}
      <div className="vh-grid cols-4" style={{ marginBottom: "var(--sp-3)" }}>
        <Card><span className="vh-stat-label">Times shown</span><div className="vh-stat-value tabular">{c!.impressions.toLocaleString("en-IN")}</div><div className="small muted">shoppers who saw it</div></Card>
        <Card><span className="vh-stat-label">Visits</span><div className="vh-stat-value tabular">{c!.clicks.toLocaleString("en-IN")}</div><div className="small muted">clicked to your product</div></Card>
        <Card><span className="vh-stat-label">Sales from ads</span><div className="vh-stat-value tabular"><MoneyText paise={c!.salesPaise} /></div><div className="small muted">{results.returnPerRupee > 0 ? `₹${results.returnPerRupee.toFixed(2)} back per ₹1` : `${c!.orders} order${c!.orders === 1 ? "" : "s"}`}</div></Card>
        <Card><span className="vh-stat-label">Money spent</span><div className="vh-stat-value tabular"><MoneyText paise={c!.spentPaise} /></div><div className="small muted">of <MoneyText paise={c!.totalBudgetPaise} /> budget · ~<MoneyText paise={avgCpc} />/visit</div></Card>
      </div>

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        {/* ── Campaign settings ─────────────────────────────── */}
        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card
            title="Campaign settings"
            action={
              <form action={toggleCampaign} style={{ display: "inline-flex" }}>
                <input type="hidden" name="campaignId" value={c!.id} />
                <input type="hidden" name="to" value={c!.status === "ACTIVE" ? "PAUSED" : "ACTIVE"} />
                <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">
                  {c!.status === "ACTIVE"
                    ? <><Pause size={13} strokeWidth={2.2} aria-hidden /> Pause</>
                    : <><Play size={13} strokeWidth={2.2} aria-hidden /> Resume</>}
                </button>
              </form>
            }
          >
            <form action={saveCampaignSettings} className="vh-grid" style={{ gap: 14 }}>
              <input type="hidden" name="campaignId" value={c!.id} />
              <div className="vh-field">
                <label className="vh-label" htmlFor="cs-name">Name</label>
                <input className="vh-input" id="cs-name" name="name" defaultValue={c!.name} maxLength={60} />
              </div>
              <div className="vh-grid cols-2" style={{ gap: 14 }}>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="cs-daily">Budget per day (₹)</label>
                  <input className="vh-input" id="cs-daily" name="dailyBudget" type="number" min={100} defaultValue={Math.round(c!.dailyBudgetPaise / 100)} />
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="cs-total">Total budget (₹)</label>
                  <input className="vh-input" id="cs-total" name="totalBudget" type="number" min={500} defaultValue={Math.round(c!.totalBudgetPaise / 100)} />
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="cs-start">Start date</label>
                  <input className="vh-input" id="cs-start" name="startDate" type="date" defaultValue={c!.startDate} />
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="cs-end">End date</label>
                  <input className="vh-input" id="cs-end" name="endDate" type="date" defaultValue={c!.endDate ?? ""} />
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="cs-strategy">Bidding style</label>
                  <select className="vh-select" id="cs-strategy" name="bidStrategy" defaultValue={c!.bidStrategy}>
                    {BID_STRATEGIES.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                  </select>
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="cs-acos">Target ad cost (share of sales %)</label>
                  <input className="vh-input" id="cs-acos" name="targetAcos" type="number" min={1} max={100} defaultValue={c!.targetAcosPct ?? ""} />
                </div>
              </div>
              <div className="vh-field">
                <span className="vh-label">Locations</span>
                <div className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                  {AD_LOCATIONS.map((l) => (
                    <label key={l.code} className="vh-row small" style={{ gap: 5 }}>
                      <input type="checkbox" name="locations" value={l.code} defaultChecked={c!.locations.includes(l.code)} /> {l.label}
                    </label>
                  ))}
                </div>
              </div>
              <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit" style={{ justifySelf: "start" }}>Save settings</button>
            </form>
          </Card>

          {/* New ad group */}
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Plus size={15} strokeWidth={2.2} aria-hidden /> New ad group</span>}>
            <form action={createAdGroup} className="vh-grid" style={{ gap: 12 }} id="new-group">
              <input type="hidden" name="campaignId" value={c!.id} />
              <div className="vh-grid cols-2" style={{ gap: 12 }}>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="ag-name">Name <span className="req">*</span></label>
                  <input className="vh-input" id="ag-name" name="name" maxLength={50} placeholder="e.g. Balms — search" />
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="ag-bid">Default bid (₹/click) <span className="req">*</span></label>
                  <input className="vh-input" id="ag-bid" name="defaultBid" type="number" min={2} step={1} placeholder="9" />
                </div>
              </div>
              <div className="vh-field">
                <span className="vh-label">Placements <span className="req">*</span></span>
                <div className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                  {PLACEMENTS.map((p) => (
                    <label key={p.key} className="vh-row small" style={{ gap: 5 }}>
                      <input type="checkbox" name="placements" value={p.key} defaultChecked={p.key === "listing-sponsored"} />
                      {p.label} <span className="muted">(floor <MoneyText paise={p.floorPaise} />)</span>
                    </label>
                  ))}
                </div>
              </div>
              <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit" style={{ justifySelf: "start" }}>Create ad group</button>
            </form>
          </Card>
        </div>

        {/* ── Ad groups ─────────────────────────────────────── */}
        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          {c!.adGroups.length === 0 && (
            <Card title="No ad groups yet">
              <p className="small muted" style={{ margin: 0 }}>Create an ad group to hold keywords, placements and creatives.</p>
            </Card>
          )}
          {c!.adGroups.map((g) => (
            <Card
              key={g.id}
              title={`${g.name}`}
              action={<span className="small muted">bid <MoneyText paise={g.defaultBidPaise} /> · {g.placements.length} placement{g.placements.length === 1 ? "" : "s"}</span>}
            >
              {/* Keywords */}
              <div style={{ marginBottom: 12 }}>
                <div className="small" style={{ fontWeight: 800, color: "var(--vh-ink)", marginBottom: 6 }}>Keywords</div>
                {g.keywords.length === 0 && g.negatives.length === 0 && (
                  <p className="small muted" style={{ margin: "0 0 8px" }}>No keywords — the group serves on browse placements only until you add some.</p>
                )}
                <div className="vh-row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {g.keywords.map((k2) => (
                    <span key={k2.id} className="vh-pill vh-pill-ok" style={{ fontSize: ".7rem" }} title={`match: ${k2.match}${k2.bidPaise ? ` · bid ₹${Math.round(k2.bidPaise / 100)}` : ""}`}>
                      {k2.text} <span style={{ opacity: 0.7 }}>[{k2.match.toLowerCase()}] · {k2.impressions} impr.</span>
                    </span>
                  ))}
                  {g.negatives.map((n) => (
                    <span key={n} className="vh-pill vh-pill-danger" style={{ fontSize: ".7rem" }}>− {n}</span>
                  ))}
                </div>
                <form action={addKeywordToGroup} className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <input type="hidden" name="campaignId" value={c!.id} />
                  <input type="hidden" name="groupId" value={g.id} />
                  <input className="vh-input" name="text" maxLength={60} placeholder="keyword…" style={{ flex: "2 1 140px" }} aria-label={`New keyword for ${g.name}`} />
                  <select className="vh-select" name="match" defaultValue="BROAD" aria-label="Match type" style={{ flex: "1 1 90px" }}>
                    <option value="BROAD">Broad</option>
                    <option value="PHRASE">Phrase</option>
                    <option value="EXACT">Exact</option>
                  </select>
                  <input className="vh-input" name="bid" type="number" min={2} placeholder="bid ₹ (opt.)" style={{ flex: "1 1 90px" }} aria-label="Keyword bid override" />
                  <label className="vh-row small" style={{ gap: 4 }}>
                    <input type="checkbox" name="negative" value="1" /> negative
                  </label>
                  <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Add keyword</button>
                </form>
                {g.aiKeywords && g.aiKeywords.length > 0 && (
                  <p className="small" style={{ margin: "8px 0 0" }}>
                    <Sparkles size={12} aria-hidden style={{ verticalAlign: -2, color: "var(--vh-accent)" }} />{" "}
                    <strong>AI keyword ideas ({aiProviderName()}) — review before applying:</strong> {g.aiKeywords.join(" · ")}
                  </p>
                )}
              </div>

              {/* Ads */}
              <div>
                <div className="small" style={{ fontWeight: 800, color: "var(--vh-ink)", marginBottom: 6 }}>Ads</div>
                {g.ads.map((a) => {
                  const product = listings.find((p) => p.id === a.productId);
                  return (
                    <div key={a.id} className="vh-row-between" style={{ gap: 8, padding: "8px 0", borderTop: "1px solid var(--vh-line)", flexWrap: "wrap" }}>
                      <span className="small" style={{ minWidth: 0 }}>
                        <strong>{a.headline}</strong>
                        <span className="muted"> · {product?.title ?? a.productId} · {a.impressions} impr. · {a.clicks} clicks</span>
                        {a.note && <div style={{ color: "var(--vh-danger)" }}>Reviewer: {a.note}</div>}
                      </span>
                      <StatusPill tone={a.status === "APPROVED" ? "ok" : a.status === "REJECTED" ? "danger" : "warn"}>{a.status.replace(/_/g, " ")}</StatusPill>
                    </div>
                  );
                })}
                <form action={createAdCreative} className="vh-grid" style={{ gap: 8, marginTop: 8 }}>
                  <input type="hidden" name="campaignId" value={c!.id} />
                  <input type="hidden" name="groupId" value={g.id} />
                  <select className="vh-select" name="productId" defaultValue={g.ads[0]?.productId ?? eligible[0]?.id ?? ""} aria-label={`Product for new ad in ${g.name}`}>
                    {eligible.map((p) => (
                      <option key={p.id} value={p.id}>{p.title} · quality {qualityScore(p)}/10</option>
                    ))}
                  </select>
                  <input
                    className="vh-input" name="headline" maxLength={90}
                    defaultValue={g.aiHeadline ?? ""}
                    placeholder="Ad headline (8–90 chars, claims-checked)"
                    aria-label={`Headline for new ad in ${g.name}`}
                  />
                  {g.aiHeadline && (
                    <p className="small muted" style={{ margin: 0 }}>
                      <Sparkles size={12} aria-hidden style={{ verticalAlign: -2, color: "var(--vh-accent)" }} />{" "}
                      AI suggestion ({aiProviderName()}) prefilled — review before applying.
                    </p>
                  )}
                  <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Create ad (goes to review)</button>
                  </div>
                </form>
                <div className="vh-row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <form action={aiSuggestHeadline} style={{ display: "inline-flex" }}>
                    <input type="hidden" name="campaignId" value={c!.id} />
                    <input type="hidden" name="groupId" value={g.id} />
                    <input type="hidden" name="productId" value={g.ads[0]?.productId ?? eligible[0]?.id ?? ""} />
                    <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">
                      <Sparkles size={13} strokeWidth={2.2} aria-hidden /> Generate headline with AI
                    </button>
                  </form>
                  <form action={aiSuggestKeywords} style={{ display: "inline-flex" }}>
                    <input type="hidden" name="campaignId" value={c!.id} />
                    <input type="hidden" name="groupId" value={g.id} />
                    <input type="hidden" name="productId" value={g.ads[0]?.productId ?? eligible[0]?.id ?? ""} />
                    <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">
                      <Sparkles size={13} strokeWidth={2.2} aria-hidden /> Suggest keywords with AI
                    </button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <p className="small muted" style={{ marginTop: "var(--sp-3)" }}>
        AI-generated copy is subject to the platform&rsquo;s rules: everything passes the claims copy-check
        before it can serve, and Medical Cannabis can never be advertised by anyone.
      </p>
    </Shell>
  );
}
