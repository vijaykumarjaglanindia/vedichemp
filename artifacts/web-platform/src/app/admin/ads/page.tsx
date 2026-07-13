/**
 * VEDIC HEMP — ADS ADMIN (§3.6, working console)
 *
 * Three functional surfaces over the ads engine:
 *   1. Creative review queue — a human approves every ad before it serves;
 *      rejection carries a note the advertiser sees. Audited both ways.
 *   2. Platform settings — minimum bid and per-placement switches; the
 *      auction reads these live.
 *   3. Campaign oversight — pause any campaign with a written reason.
 *
 * A1 remains three independent layers: campaign creation rejects the class,
 * this queue can never receive it, and the auction drops any such candidate
 * with a logged violation. There is no override at any layer.
 */

import type { Metadata } from "next";
import { Ban, FlagTriangleRight, Megaphone, SlidersHorizontal } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, ComplianceBadge, DataTable, MoneyText, StatusPill, toneForStatus, type Column } from "@/components/ui";
import { listCampaigns, PLACEMENTS, qualityScore, readAdSettings, reviewQueue, type Campaign } from "@/lib/ads";
import { adminPauseCampaign, decideAdReview, saveAdPlatformSettings } from "../actions";

export const metadata: Metadata = { title: "Ads · Admin" };

const I = { size: 16, strokeWidth: 2.2 } as const;

const MESSAGES: Record<string, { severity: "ok" | "danger" | "warn"; title: string; body: string }> = {
  approved: { severity: "ok", title: "Creative approved", body: "The campaign is eligible to serve; the auction takes it from here (bid × quality, fair rotation)." },
  rejected: { severity: "ok", title: "Creative rejected", body: "The advertiser sees your note on the campaign page." },
  note: { severity: "danger", title: "A reviewer note is required to reject", body: "Write what failed (≥ 20 characters). The attempt was logged." },
  state: { severity: "warn", title: "Nothing pending on that creative", body: "It has already been decided." },
};

export default async function AdminAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ ad?: string; settings?: string; camp?: string }>;
}) {
  const { ad, settings: settingsFlag, camp } = await searchParams;
  const queue = await reviewQueue();
  const settings = await readAdSettings();
  const campaigns = await listCampaigns();
  const msg = ad ? MESSAGES[ad] : undefined;

  const campaignColumns: Column<Campaign>[] = [
    { key: "name", header: "Campaign", render: (c) => (
        <div>
          <div style={{ fontWeight: 600 }}>{c.name}</div>
          <div className="small muted">{c.seller} · {c.adGroups.reduce((n, g) => n + g.ads.length, 0)} ads · {c.locations.includes("ALL") ? "All India" : c.locations.join(", ")}</div>
        </div>
      ) },
    { key: "budget", header: "Spend / budget", align: "right", render: (c) => (
        <span className="small tabular"><MoneyText paise={c.spentPaise} /> / <MoneyText paise={c.totalBudgetPaise} /></span>
      ) },
    { key: "perf", header: "Impr. · clicks", align: "right", render: (c) => <span className="tabular">{c.impressions} · {c.clicks}</span> },
    { key: "status", header: "Status", render: (c) => <StatusPill tone={toneForStatus(c.status)}>{c.status.replace(/_/g, " ")}</StatusPill> },
    { key: "act", header: "", align: "right", render: (c) =>
        c.status === "ACTIVE" ? (
          <details style={{ position: "relative" }}>
            <summary className="vh-btn vh-btn-sm vh-btn-ghost" style={{ listStyle: "none", cursor: "pointer" }}>Pause…</summary>
            <form action={adminPauseCampaign} className="vh-card" style={{ position: "absolute", right: 0, zIndex: 5, padding: 12, width: 300, display: "grid", gap: 8, textAlign: "left" }}>
              <input type="hidden" name="campaignId" value={c.id} />
              <input type="hidden" name="op" value="pause" />
              <label className="vh-label" htmlFor={`pz-${c.id}`}>Reason the advertiser will see (≥ 20 chars)</label>
              <textarea className="vh-textarea" id={`pz-${c.id}`} name="reason" rows={2} maxLength={300} placeholder="e.g. Creative landing page mismatch reported by buyers." />
              <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Pause campaign</button>
            </form>
          </details>
        ) : c.status === "PAUSED" ? (
          <form action={adminPauseCampaign} style={{ display: "inline-flex" }}>
            <input type="hidden" name="campaignId" value={c.id} />
            <input type="hidden" name="op" value="resume" />
            <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Resume</button>
          </form>
        ) : null },
  ];

  return (
    <Shell active="/admin/ads" breadcrumb={["Admin", "Ads"]} title="Ads administration">
      {msg && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity={msg.severity} title={msg.title}>{msg.body}</Banner></div>}
      {settingsFlag === "saved" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title="Platform ad settings saved">The auction reads them on the next request — floors and switched-off placements apply immediately.</Banner></div>}
      {settingsFlag === "minbid" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="danger" title="Minimum bid must be ₹1–₹500">Nothing was changed.</Banner></div>}
      {camp === "paused" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title="Campaign paused platform-side">The advertiser sees your reason on their campaign page.</Banner></div>}
      {camp === "resumed" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title="Campaign resumed">It re-enters auctions immediately.</Banner></div>}
      {camp === "reason" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="danger" title="A written reason is required to pause">≥ 20 characters. The attempt was logged.</Banner></div>}

      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        {/* ── 1. Creative review queue ──────────────────────── */}
        <div id="review-queue">
          <Card
            title={<span className="vh-row" style={{ gap: 8 }}><FlagTriangleRight {...I} aria-hidden /> Creative review queue</span>}
            action={<StatusPill tone={queue.length ? "warn" : "ok"}>{queue.length} pending</StatusPill>}
          >
            <p className="small muted" style={{ marginTop: 0 }}>
              Every creative is reviewed by a human before it can serve. The reviewer checks the headline
              against the claims rule (no cure/treat/prevent — the same check the API already ran), the
              landing listing, and the Sponsored-label rendering. MED_CANNABIS cannot reach this queue
              (A1, layer 1) and would be dropped at auction regardless (layer 3).
            </p>
            {queue.length === 0 ? (
              <p className="small muted">Queue is empty.</p>
            ) : (
              <div className="vh-grid cols-2">
                {queue.map(({ campaign, group, ad: creative, product }) => (
                  <div key={creative.id} className="vh-card" style={{ padding: "var(--sp-3)", display: "grid", gap: "var(--sp-2)" }}>
                    <div className="vh-row-between" style={{ gap: 8 }}>
                      <strong style={{ minWidth: 0 }}>{creative.headline}</strong>
                      {product && <ComplianceBadge cls={product.cls} />}
                    </div>
                    <div className="small muted">
                      {campaign.name} → {group.name} · {product?.title ?? creative.productId} · {campaign.seller}
                      {product && <> · quality {qualityScore(product)}/10</>}
                    </div>
                    <form action={decideAdReview} style={{ display: "grid", gap: 8 }}>
                      <input type="hidden" name="campaignId" value={campaign.id} />
                      <input type="hidden" name="adId" value={creative.id} />
                      <textarea className="vh-textarea" name="note" rows={2} maxLength={300}
                        placeholder="Rejection note the advertiser will see (≥ 20 chars; not needed to approve)" aria-label={`Reviewer note for ${creative.headline}`} />
                      <div className="vh-row" style={{ gap: 8 }}>
                        <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit" name="decision" value="approve">Approve — eligible to serve</button>
                        <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit" name="decision" value="reject">Reject</button>
                      </div>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── 2. Platform settings ──────────────────────────── */}
        <div id="platform">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><SlidersHorizontal {...I} aria-hidden /> Platform auction settings</span>}>
            <form action={saveAdPlatformSettings} className="vh-grid" style={{ gap: 14 }}>
              <div className="vh-field" style={{ maxWidth: 260 }}>
                <label className="vh-label" htmlFor="ads-minbid">Minimum bid (₹ per click)</label>
                <input className="vh-input" id="ads-minbid" name="minBid" type="number" min={1} max={500} defaultValue={Math.round(settings.minBidPaise / 100)} />
                <span className="vh-help">Applies beneath every placement floor. Current: <MoneyText paise={settings.minBidPaise} /></span>
              </div>
              <div className="vh-field">
                <span className="vh-label">Placements on sale</span>
                <div className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                  {PLACEMENTS.map((p) => (
                    <label key={p.key} className="vh-row small" style={{ gap: 5 }}>
                      <input type="checkbox" name="placements" value={p.key} defaultChecked={settings.placementsEnabled[p.key] !== false} />
                      {p.label} <span className="muted">(floor <MoneyText paise={p.floorPaise} />)</span>
                    </label>
                  ))}
                </div>
                <span className="vh-help">A switched-off placement returns no ad — the slot simply doesn&rsquo;t sell.</span>
              </div>
              <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit" style={{ justifySelf: "start" }}>Save platform settings</button>
            </form>
          </Card>
        </div>

        {/* ── 3. Campaign oversight ─────────────────────────── */}
        <div id="oversight">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Megaphone {...I} aria-hidden /> Campaign oversight</span>} pad0>
            <DataTable columns={campaignColumns} rows={campaigns} empty={<div className="vh-empty">No campaigns yet.</div>} />
          </Card>
        </div>

        <Banner severity="danger" title="A1 — Medical Cannabis advertising: absent at three independent layers">
          <span className="vh-row" style={{ gap: 8, alignItems: "flex-start" }}>
            <Ban size={16} strokeWidth={2.2} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              (1) campaign creation and its API reject the class and log the attempt; (2) this review queue can never
              receive it; (3) the auction re-checks every candidate and drops violations with an audit row. Claims-flagged
              listings are equally barred until compliance clears the flag. There is no override endpoint at any layer,
              for any role.
            </span>
          </span>
        </Banner>
      </div>
    </Shell>
  );
}
