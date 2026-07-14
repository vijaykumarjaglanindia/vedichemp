/**
 * VEDIC HEMP — VEDIC ADS ENGINE (campaigns → ad groups → keywords/ads/placements)
 *
 * The full advertiser stack, modelled on Amazon/Flipkart sponsored ads and
 * Google's auction mechanics, sized for this marketplace:
 *
 *   Campaign  — objective, daily + total budget (paise), schedule, location
 *               targeting, bid strategy (manual / enhanced / target-ACoS /
 *               max-clicks)
 *   Ad group  — default bid, placements, keywords (broad/phrase/exact, per-
 *               keyword bids), negative keywords, ad creatives
 *   Auction   — adRank = effectiveBid × qualityScore, second-price charging,
 *               PROPORTIONAL-FAIR rotation so every eligible advertiser wins
 *               impressions in proportion to bid × quality — a smaller
 *               advertiser with a great listing still gets seen.
 *
 * Compliance is structural, not configurable:
 *   A1 — MED_CANNABIS can never enter a campaign; the auction re-drops it
 *        with a logged violation even if a crafted id sneaks past the UI.
 *   Claims — a listing flagged for attempting medical-claims copy
 *        (claimsStrike) is barred from advertising until compliance clears
 *        it, and ad headlines pass the same claims copy-check as listings.
 *   Every paid impression renders behind a visible "Sponsored" label.
 *
 * Server-side store = the DB seam (AdCampaign tables carry the A1 CHECK).
 */

import { findProduct, REGULATED_CLASSES, type CatalogProduct } from "@/lib/catalog";
import { violatesClaimsCopy } from "@/lib/claims";
import { writeAudit } from "@/lib/audit";
import { matchesQuery } from "@/lib/search";

/* ── Vocabulary ───────────────────────────────────────────── */

export type Objective = "SPONSORED_PRODUCTS" | "BANNER" | "VIDEO";
export type BidStrategy = "MANUAL_CPC" | "ENHANCED_CPC" | "TARGET_ACOS" | "MAX_CLICKS";
export type MatchType = "BROAD" | "PHRASE" | "EXACT";
export type CampaignStatus = "IN_REVIEW" | "ACTIVE" | "PAUSED" | "ENDED" | "REJECTED";
export type AdStatus = "IN_REVIEW" | "APPROVED" | "REJECTED";

export const OBJECTIVES: { key: Objective; label: string }[] = [
  { key: "SPONSORED_PRODUCTS", label: "Sponsored Products" },
  { key: "BANNER", label: "Brand banner" },
  { key: "VIDEO", label: "Video spotlight" },
];

export const BID_STRATEGIES: { key: BidStrategy; label: string; help: string }[] = [
  { key: "MANUAL_CPC", label: "I'll set the price", help: "You choose the most to pay per click." },
  { key: "ENHANCED_CPC", label: "Help me get more sales", help: "We nudge your price up a little when a shopper looks likely to buy." },
  { key: "TARGET_ACOS", label: "Spend to hit a cost", help: "We keep ad spend near the share of sales you pick." },
  { key: "MAX_CLICKS", label: "Get me the most visits", help: "We aim for the most clicks for your money." },
];

export const PLACEMENTS = [
  { key: "home-sponsored-products", label: "Home — sponsored products", floorPaise: 500 },
  { key: "home-video", label: "Home — video spotlight", floorPaise: 900 },
  { key: "listing-sponsored", label: "Search & listings — sponsored tile", floorPaise: 700 },
  { key: "listing-brand-banner", label: "Listings — brand banner", floorPaise: 800 },
  { key: "listing-sidebar", label: "Listings — sidebar", floorPaise: 400 },
  { key: "thankyou-related", label: "Order confirmation — related", floorPaise: 300 },
] as const;
export type PlacementKey = (typeof PLACEMENTS)[number]["key"];

export const AD_LOCATIONS: { code: string; label: string }[] = [
  { code: "ALL", label: "All India" },
  { code: "MH", label: "Maharashtra" },
  { code: "KA", label: "Karnataka" },
  { code: "DL", label: "Delhi NCR" },
  { code: "TN", label: "Tamil Nadu" },
  { code: "TG", label: "Telangana" },
  { code: "GJ", label: "Gujarat" },
  { code: "RJ", label: "Rajasthan" },
  { code: "UP", label: "Uttar Pradesh" },
  { code: "WB", label: "West Bengal" },
  { code: "KL", label: "Kerala" },
  { code: "PB", label: "Punjab" },
];

/* ── Shapes ───────────────────────────────────────────────── */

export interface Keyword {
  id: string;
  text: string;
  match: MatchType;
  bidPaise?: number; // overrides the ad group's default bid
  impressions: number;
}

export interface AdCreative {
  id: string;
  productId: string;
  headline: string;
  status: AdStatus;
  note?: string; // reviewer note on rejection
  impressions: number;
  clicks: number;
  lastChargePaise: number; // second-price set by the most recent auction win
}

export interface AdGroup {
  id: string;
  name: string;
  defaultBidPaise: number;
  placements: PlacementKey[];
  keywords: Keyword[];
  negatives: string[];
  ads: AdCreative[];
  aiHeadline?: string; // last AI suggestion (review before applying)
  aiKeywords?: string[];
}

/** One day's tally for a campaign — the basis of the plain-language results. */
export interface DayStat {
  shown: number;     // times shown (impressions)
  clicks: number;    // visits to the product
  spentPaise: number;
  salesPaise: number; // sales that started from an ad click that day
  orders: number;
}

export interface Campaign {
  id: string;
  seller: string;
  sellerEmail: string;
  name: string;
  objective: Objective;
  status: CampaignStatus;
  dailyBudgetPaise: number;
  totalBudgetPaise: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  locations: string[]; // AD_LOCATIONS codes; ["ALL"] = everywhere
  bidStrategy: BidStrategy;
  targetAcosPct?: number;
  adGroups: AdGroup[];
  spentPaise: number;
  impressions: number;
  clicks: number;
  salesPaise: number; // sales that started from a click on this campaign's ad
  orders: number;     // purchases that started from an ad click
  daily: Record<string, DayStat>; // YYYY-MM-DD → that day's tally
  note?: string;
  createdAt: string;
}

/** A recent ad click, remembered so a later purchase can be credited to the ad. */
export interface AdClickTouch {
  productId: string;
  campaignId: string;
  buyerKey: string; // buyer email, or "anon"
  at: number; // epoch ms
}

export interface AdSettings {
  minBidPaise: number; // platform-wide floor beneath placement floors
  placementsEnabled: Record<string, boolean>;
}

interface AdsStore {
  campaigns: Campaign[];
  settings: AdSettings;
  served: Record<string, number>; // `${placement}:${adId}` → impressions (rotation state)
  touches: AdClickTouch[]; // recent ad clicks awaiting a purchase to credit
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhAds: AdsStore | undefined;
}

function store(): AdsStore {
  globalThis.__vhAds ??= {
    campaigns: [],
    settings: {
      minBidPaise: 200,
      placementsEnabled: Object.fromEntries(PLACEMENTS.map((p) => [p.key, true])),
    },
    served: {},
    touches: [],
    seq: 1,
  };
  return globalThis.__vhAds;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Get (creating if needed) a campaign's tally for a given day. */
function dayStat(c: Campaign, date: string): DayStat {
  return (c.daily[date] ??= { shown: 0, clicks: 0, spentPaise: 0, salesPaise: 0, orders: 0 });
}

/** What a campaign has already spent TODAY (drives daily-budget pacing). */
function spentToday(c: Campaign): number {
  return c.daily[today()]?.spentPaise ?? 0;
}

/* ── Settings (Admin → Ads) ───────────────────────────────── */

export async function readAdSettings(): Promise<AdSettings> {
  return store().settings;
}
export async function writeAdSettings(patch: Partial<AdSettings>): Promise<void> {
  const s = store();
  s.settings = {
    ...s.settings,
    ...(patch.minBidPaise !== undefined ? { minBidPaise: patch.minBidPaise } : {}),
    placementsEnabled: { ...s.settings.placementsEnabled, ...(patch.placementsEnabled ?? {}) },
  };
}

/* ── Eligibility (the seller-facing rule, restated in code) ── */

export type AdEligibility = { ok: true } | { ok: false; reason: "a1" | "strike" | "state" | "coa" };

/**
 * Whether a LISTING may be advertised at all. This is where the platform
 * rule the seller sees on every form lands: no medical claims anywhere, and
 * a listing flagged for attempting claims copy cannot be advertised until
 * compliance clears the flag.
 */
export function adEligibility(p: CatalogProduct): AdEligibility {
  if (p.cls === "MED_CANNABIS") return { ok: false, reason: "a1" };
  if (p.claimsStrike) return { ok: false, reason: "strike" };
  if (p.status !== "LIVE") return { ok: false, reason: "state" };
  if (REGULATED_CLASSES.includes(p.cls) && p.coaState !== "APPROVED") return { ok: false, reason: "coa" };
  return { ok: true };
}

/* ── Quality score (1–10, deterministic) ──────────────────── */

/**
 * Listing quality drives auction rank alongside the bid — money alone cannot
 * buy the slot. Rating, an approved lab report and a real discount all lift
 * quality, exactly the signals that make a paid tile useful to buyers.
 */
export function qualityScore(p: CatalogProduct): number {
  let q = 4;
  q += Math.min(3, p.rating * 0.6);
  if (p.labVerified) q += 1.5;
  const off = p.mrpPaise > p.pricePaise ? ((p.mrpPaise - p.pricePaise) / p.mrpPaise) * 100 : 0;
  if (off >= 10) q += 1;
  if (off >= 25) q += 0.5;
  return Math.max(1, Math.min(10, Math.round(q * 10) / 10));
}

/** Deterministic daily-impression estimate for a keyword (shown at add time). */
export async function estimateKeywordImpressions(text: string): Promise<number> {
  const { readLiveProducts } = await import("@/lib/catalog");
  const live = await readLiveProducts();
  const q = text.trim().toLowerCase();
  const matches = live.filter((p) => matchesQuery(`${p.title} ${p.seller}`, q)).length;
  return 40 + matches * 120 + Math.max(0, 24 - text.length) * 5;
}

/* ── Campaign CRUD ────────────────────────────────────────── */

export interface CreateCampaignInput {
  seller: string;
  sellerEmail: string;
  name: string;
  objective: Objective;
  dailyBudgetPaise: number;
  totalBudgetPaise: number;
  startDate: string;
  endDate?: string;
  locations: string[];
  bidStrategy: BidStrategy;
  targetAcosPct?: number;
}

export async function createAdCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const s = store();
  const campaign: Campaign = {
    id: `cmp${s.seq++}`,
    ...input,
    locations: input.locations.length ? input.locations : ["ALL"],
    status: "IN_REVIEW",
    adGroups: [],
    spentPaise: 0,
    impressions: 0,
    clicks: 0,
    salesPaise: 0,
    orders: 0,
    daily: {},
    createdAt: new Date().toISOString(),
  };
  s.campaigns.unshift(campaign);
  return campaign;
}

export async function listCampaigns(sellerEmail?: string): Promise<Campaign[]> {
  const all = store().campaigns;
  return sellerEmail ? all.filter((c) => c.sellerEmail === sellerEmail || c.seller === "Vedic Botanicals") : all;
}

export async function findCampaign(id: string): Promise<Campaign | null> {
  return store().campaigns.find((c) => c.id === id) ?? null;
}

export async function updateCampaignSettings(
  id: string,
  patch: Partial<Pick<Campaign, "name" | "dailyBudgetPaise" | "totalBudgetPaise" | "startDate" | "endDate" | "locations" | "bidStrategy" | "targetAcosPct">>,
): Promise<boolean> {
  const c = await findCampaign(id);
  if (!c) return false;
  Object.assign(c, patch);
  return true;
}

export async function setCampaignStatus(id: string, to: CampaignStatus, note?: string): Promise<boolean> {
  const c = await findCampaign(id);
  if (!c) return false;
  c.status = to;
  if (note) c.note = note;
  return true;
}

/* ── Ad group / keyword / ad CRUD ─────────────────────────── */

export async function addAdGroup(
  campaignId: string,
  input: { name: string; defaultBidPaise: number; placements: PlacementKey[] },
): Promise<AdGroup | null> {
  const c = await findCampaign(campaignId);
  if (!c) return null;
  const s = store();
  const group: AdGroup = {
    id: `ag${s.seq++}`,
    name: input.name,
    defaultBidPaise: input.defaultBidPaise,
    placements: input.placements,
    keywords: [],
    negatives: [],
    ads: [],
  };
  c.adGroups.push(group);
  return group;
}

export function findGroup(c: Campaign, groupId: string): AdGroup | null {
  return c.adGroups.find((g) => g.id === groupId) ?? null;
}

export async function addKeyword(
  campaignId: string,
  groupId: string,
  input: { text: string; match: MatchType; bidPaise?: number },
): Promise<{ ok: boolean; estimate?: number }> {
  const c = await findCampaign(campaignId);
  const g = c && findGroup(c, groupId);
  if (!g) return { ok: false };
  const text = input.text.trim().toLowerCase();
  if (!text || g.keywords.some((k) => k.text === text && k.match === input.match)) return { ok: false };
  const s = store();
  g.keywords.push({
    id: `kw${s.seq++}`, text, match: input.match,
    ...(input.bidPaise ? { bidPaise: input.bidPaise } : {}),
    impressions: 0,
  });
  return { ok: true, estimate: await estimateKeywordImpressions(text) };
}

export async function addNegativeKeyword(campaignId: string, groupId: string, text: string): Promise<boolean> {
  const c = await findCampaign(campaignId);
  const g = c && findGroup(c, groupId);
  const t = text.trim().toLowerCase();
  if (!g || !t || g.negatives.includes(t)) return false;
  g.negatives.push(t);
  return true;
}

export type AddAdResult = { ok: true; ad: AdCreative } | { ok: false; reason: string };

/** Create a creative. A1 + claims-strike + claims headline all fail closed. */
export async function addAd(
  campaignId: string,
  groupId: string,
  input: { productId: string; headline: string },
): Promise<AddAdResult> {
  const c = await findCampaign(campaignId);
  const g = c && findGroup(c, groupId);
  if (!c || !g) return { ok: false, reason: "missing" };
  const product = await findProduct(input.productId);
  if (!product) return { ok: false, reason: "product" };
  const elig = adEligibility(product);
  if (!elig.ok) {
    // A1 attempts are violations worth logging even at the API layer.
    if (elig.reason === "a1") {
      await writeAudit({ actor: c.sellerEmail, action: "AD_CREATE", target: input.productId, outcome: "DENIED", note: "A1: MED_CANNABIS is never advertisable" });
    }
    return { ok: false, reason: elig.reason };
  }
  if (violatesClaimsCopy(input.headline)) return { ok: false, reason: "claims" };
  const s = store();
  const ad: AdCreative = {
    id: `ad${s.seq++}`,
    productId: input.productId,
    headline: input.headline,
    status: "IN_REVIEW",
    impressions: 0,
    clicks: 0,
    lastChargePaise: 0,
  };
  g.ads.push(ad);
  return { ok: true, ad };
}

/** Admin creative review. Approving the first ad activates an IN_REVIEW campaign. */
export async function decideAd(
  campaignId: string,
  adId: string,
  approve: boolean,
  note?: string,
): Promise<boolean> {
  const c = await findCampaign(campaignId);
  if (!c) return false;
  for (const g of c.adGroups) {
    const ad = g.ads.find((a) => a.id === adId);
    if (ad) {
      ad.status = approve ? "APPROVED" : "REJECTED";
      if (note) ad.note = note;
      if (approve && c.status === "IN_REVIEW") c.status = "ACTIVE";
      return true;
    }
  }
  return false;
}

/** Every creative across every campaign that still needs a human review. */
export async function reviewQueue(): Promise<{ campaign: Campaign; group: AdGroup; ad: AdCreative; product: CatalogProduct | null }[]> {
  const out: { campaign: Campaign; group: AdGroup; ad: AdCreative; product: CatalogProduct | null }[] = [];
  for (const c of store().campaigns)
    for (const g of c.adGroups)
      for (const ad of g.ads)
        if (ad.status === "IN_REVIEW") out.push({ campaign: c, group: g, ad, product: await findProduct(ad.productId) });
  return out;
}

/* ── The auction ──────────────────────────────────────────── */

function keywordMatches(g: AdGroup, q: string): Keyword | null {
  const query = q.trim().toLowerCase();
  if (g.negatives.some((n) => query.includes(n))) return null;
  for (const k of g.keywords) {
    if (k.match === "EXACT" && query === k.text) return k;
    if (k.match === "PHRASE" && query.includes(k.text)) return k;
    if (k.match === "BROAD" && (matchesQuery(query, k.text) || matchesQuery(k.text, query) || query.includes(k.text))) return k;
  }
  return null;
}

function effectiveBid(c: Campaign, bidPaise: number, product: CatalogProduct): number {
  switch (c.bidStrategy) {
    case "ENHANCED_CPC":
      return Math.round(bidPaise * 1.15);
    case "TARGET_ACOS": {
      // Cap the bid so spend per projected sale stays at target ACoS (2% CVR).
      const cap = Math.round((product.pricePaise * (c.targetAcosPct ?? 15)) / 100 * 0.02 * 10);
      return Math.min(bidPaise, Math.max(cap, 100));
    }
    case "MAX_CLICKS":
      return Math.max(Math.round(bidPaise * 0.8), 100);
    default:
      return bidPaise;
  }
}

export interface AuctionWin {
  campaignId: string;
  adId: string;
  headline: string;
  product: CatalogProduct;
  seller: string;
  chargePaise: number; // second price — what a click will cost
  qualityScore: number;
}

/**
 * Run the auction for one placement (optionally against a search query and a
 * buyer location). Rank = effectiveBid × qualityScore; the winner is chosen
 * PROPORTIONALLY-FAIRLY: each candidate's rank is discounted by impressions
 * already served, so share of voice tracks bid × quality instead of the top
 * bidder taking every impression. Charges the classic second price.
 */
export async function runAuction(
  placement: PlacementKey,
  ctx?: { q?: string; location?: string },
): Promise<AuctionWin | null> {
  const s = store();
  if (!s.settings.placementsEnabled[placement]) return null;
  const floor = Math.max(PLACEMENTS.find((p) => p.key === placement)?.floorPaise ?? 0, s.settings.minBidPaise);
  const now = today();

  const candidates: { c: Campaign; g: AdGroup; ad: AdCreative; kw: Keyword | null; product: CatalogProduct; rank: number; bid: number; qs: number }[] = [];
  for (const c of s.campaigns) {
    if (c.status !== "ACTIVE") continue;
    if (c.startDate > now || (c.endDate && c.endDate < now)) continue;
    // Two ceilings: today's spend against the daily budget (resets each day),
    // and lifetime spend against the total budget.
    if (spentToday(c) >= c.dailyBudgetPaise) continue;
    if (c.spentPaise >= c.totalBudgetPaise) continue;
    if (ctx?.location && !c.locations.includes("ALL") && !c.locations.includes(ctx.location)) continue;
    for (const g of c.adGroups) {
      if (!g.placements.includes(placement)) continue;
      let kw: Keyword | null = null;
      if (ctx?.q) {
        kw = keywordMatches(g, ctx.q);
        if (!kw && g.keywords.length > 0) continue; // keyworded group + no match = no entry
      }
      for (const ad of g.ads) {
        if (ad.status !== "APPROVED") continue;
        const product = await findProduct(ad.productId);
        if (!product) continue;
        const elig = adEligibility(product);
        if (!elig.ok) {
          // Layer 3 (A1 et al): drop at auction time with a logged violation.
          if (elig.reason === "a1") {
            await writeAudit({ actor: "ad-auction", action: "AD_AUCTION_DROP", target: ad.id, outcome: "DENIED", note: "A1: medical candidate dropped at auction" });
          }
          continue;
        }
        const bid = effectiveBid(c, kw?.bidPaise ?? g.defaultBidPaise, product);
        if (bid < floor) continue;
        const qs = qualityScore(product);
        candidates.push({ c, g, ad, kw, product, rank: bid * qs, bid, qs });
      }
    }
  }
  if (candidates.length === 0) return null;

  // Proportional-fair pick: discount rank by impressions already served here.
  let winner = candidates[0]!;
  let best = -1;
  for (const cand of candidates) {
    const servedKey = `${placement}:${cand.ad.id}`;
    const fairScore = cand.rank / (1 + (s.served[servedKey] ?? 0));
    if (fairScore > best) {
      best = fairScore;
      winner = cand;
    }
  }

  // Second price: pay just enough to beat the runner-up's rank (or the floor).
  const runnerUp = candidates.filter((x) => x !== winner).sort((a, b) => b.rank - a.rank)[0];
  const charge = Math.max(floor, Math.min(winner.bid, runnerUp ? Math.ceil(runnerUp.rank / winner.qs) + 1 : floor));

  // Record the impression (campaign, ad, keyword, rotation state).
  const servedKey = `${placement}:${winner.ad.id}`;
  s.served[servedKey] = (s.served[servedKey] ?? 0) + 1;
  winner.ad.impressions += 1;
  winner.ad.lastChargePaise = charge;
  winner.c.impressions += 1;
  dayStat(winner.c, now).shown += 1;
  if (winner.kw) winner.kw.impressions += 1;

  return {
    campaignId: winner.c.id,
    adId: winner.ad.id,
    headline: winner.ad.headline,
    product: winner.product,
    seller: winner.c.seller,
    chargePaise: charge,
    qualityScore: winner.qs,
  };
}

/** A click charges the stored second price server-side; budgets fail closed.
 *  The click is also remembered (per buyer, per product) so that if the buyer
 *  goes on to purchase, the sale can be credited back to this ad. */
export async function recordAdClick(campaignId: string, adId: string, buyerEmail?: string): Promise<CatalogProduct | null> {
  const s = store();
  const c = await findCampaign(campaignId);
  if (!c) return null;
  for (const g of c.adGroups) {
    const ad = g.ads.find((a) => a.id === adId);
    if (!ad) continue;
    const product = await findProduct(ad.productId);
    if (!product) return null;
    if (c.status === "ACTIVE") {
      ad.clicks += 1;
      c.clicks += 1;
      c.spentPaise += ad.lastChargePaise;
      const d = dayStat(c, today());
      d.clicks += 1;
      d.spentPaise += ad.lastChargePaise;
      // Remember this click so a later purchase of the same product credits it.
      s.touches.unshift({ productId: ad.productId, campaignId: c.id, buyerKey: buyerEmail || "anon", at: Date.now() });
      if (s.touches.length > 2000) s.touches.length = 2000;
      if (c.spentPaise >= c.totalBudgetPaise) c.status = "ENDED";
    }
    return product; // redirect target resolved server-side, never from the URL
  }
  return null;
}

/* ── Sales attribution + plain-language results ───────────────── */

const ATTRIBUTION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // a purchase within 14 days of the click counts

/**
 * Credit ad-driven sales. For each purchased line, if this buyer clicked an ad
 * for that product recently, the campaign gets the sale (money + one order) and
 * the click is consumed so it is never counted twice. Called after an order is
 * created. Returns the total sales credited to ads (paise).
 */
export async function attributeOrderSales(
  buyerEmail: string,
  items: { productId: string; linePaise: number }[],
): Promise<number> {
  const s = store();
  const cutoff = Date.now() - ATTRIBUTION_WINDOW_MS;
  let credited = 0;
  for (const it of items) {
    const idx = s.touches.findIndex(
      (t) => t.productId === it.productId && (t.buyerKey === buyerEmail || t.buyerKey === "anon") && t.at >= cutoff,
    );
    if (idx === -1) continue;
    const touch = s.touches[idx]!;
    const c = s.campaigns.find((x) => x.id === touch.campaignId);
    s.touches.splice(idx, 1); // consume: one click credits at most one sale
    if (!c) continue;
    c.salesPaise += it.linePaise;
    c.orders += 1;
    const d = dayStat(c, today());
    d.salesPaise += it.linePaise;
    d.orders += 1;
    credited += it.linePaise;
  }
  return credited;
}

/** Plain-English performance for one campaign (no jargon in the field names). */
export interface AdResults {
  shown: number;       // times shown
  visits: number;      // clicks
  spentPaise: number;  // money spent
  salesPaise: number;  // sales from ads
  orders: number;      // purchases from ads
  /** For every ₹1 spent, this many ₹ came back in sales. 0 when nothing spent. */
  returnPerRupee: number;
  /** Sales as a share of spend, ×; the inverse plain view of "ad cost vs sales". */
  costSharePct: number; // spend ÷ sales × 100 (0 when no sales)
}

export function campaignResults(c: Campaign): AdResults {
  return summariseResults(c.impressions, c.clicks, c.spentPaise, c.salesPaise, c.orders);
}

export function accountResults(campaigns: Campaign[]): AdResults {
  const t = campaigns.reduce(
    (a, c) => ({
      shown: a.shown + c.impressions,
      visits: a.visits + c.clicks,
      spent: a.spent + c.spentPaise,
      sales: a.sales + c.salesPaise,
      orders: a.orders + c.orders,
    }),
    { shown: 0, visits: 0, spent: 0, sales: 0, orders: 0 },
  );
  return summariseResults(t.shown, t.visits, t.spent, t.sales, t.orders);
}

function summariseResults(shown: number, visits: number, spentPaise: number, salesPaise: number, orders: number): AdResults {
  return {
    shown,
    visits,
    spentPaise,
    salesPaise,
    orders,
    returnPerRupee: spentPaise > 0 ? Math.round((salesPaise / spentPaise) * 100) / 100 : 0,
    costSharePct: salesPaise > 0 ? Math.round((spentPaise / salesPaise) * 100) : 0,
  };
}

/** The last N days for a campaign as a simple series (oldest → newest). */
export function last7Days(c: Campaign): { date: string; shown: number; visits: number; salesPaise: number }[] {
  const out: { date: string; shown: number; visits: number; salesPaise: number }[] = [];
  const base = new Date(`${today()}T00:00:00Z`).getTime();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(base - i * 86400000).toISOString().slice(0, 10);
    const d = c.daily[date];
    out.push({ date, shown: d?.shown ?? 0, visits: d?.clicks ?? 0, salesPaise: d?.salesPaise ?? 0 });
  }
  return out;
}

/** Plain-language "ideas to improve" — rule-based, no jargon. */
export interface AdIdea { tone: "warn" | "info" | "ok"; text: string; campaign?: string }

export function adIdeas(campaigns: Campaign[]): AdIdea[] {
  const ideas: AdIdea[] = [];
  for (const c of campaigns) {
    if (c.status === "IN_REVIEW") {
      ideas.push({ tone: "info", campaign: c.name, text: `"${c.name}" is being checked by our team. It starts showing to shoppers once the ad is approved.` });
      continue;
    }
    if (c.status !== "ACTIVE") continue;
    // Spent money, no sales yet.
    if (c.spentPaise >= 5000 && c.salesPaise === 0) {
      ideas.push({ tone: "warn", campaign: c.name, text: `"${c.name}" has spent ${rupees(c.spentPaise)} but hasn't made a sale yet. Try a lower cost per click, or add clearer words shoppers would search for.` });
    }
    // Used the full daily budget → could show more.
    if (c.dailyBudgetPaise > 0 && spentToday(c) >= c.dailyBudgetPaise) {
      ideas.push({ tone: "info", campaign: c.name, text: `"${c.name}" used its full daily budget today. Raise the daily budget to be shown to more shoppers.` });
    }
    // Shown a lot but few visits.
    if (c.impressions >= 100 && c.clicks / Math.max(1, c.impressions) < 0.01) {
      ideas.push({ tone: "info", campaign: c.name, text: `"${c.name}" was shown often but few shoppers clicked. A clearer product photo, title or a better price usually helps.` });
    }
    // Doing well.
    if (c.salesPaise > 0 && c.spentPaise > 0 && c.salesPaise >= c.spentPaise * 3) {
      ideas.push({ tone: "ok", campaign: c.name, text: `"${c.name}" is doing well — every ₹1 spent brought back ${rupees(Math.round((c.salesPaise / c.spentPaise) * 100))} in sales. Consider giving it a bigger budget.` });
    }
    // Keywords shown with no clicks — suggest pruning.
    for (const g of c.adGroups) {
      const dead = g.keywords.filter((k) => k.impressions >= 50);
      if (dead.length && c.clicks === 0) {
        ideas.push({ tone: "info", campaign: c.name, text: `Some search words in "${c.name}" show your ad but bring no visits. Removing the weakest ones focuses your budget.` });
        break;
      }
    }
  }
  if (ideas.length === 0) {
    ideas.push({ tone: "ok", text: "Nothing needs your attention right now. Check back after your ads have run for a day or two." });
  }
  return ideas.slice(0, 8);
}

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
