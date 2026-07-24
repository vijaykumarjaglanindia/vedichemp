/**
 * VEDIC HEMP — BUYER DASHBOARD HOME (§1.1)
 *
 * Server-driven widget layout (W1–W15 in the spec). The server decides which
 * widgets render and in what order (widget ranking): Rx expiry → payment
 * pending → pending actions → recent orders → subscriptions → wallet/rewards
 * → recommendations → offers. A client can never reorder or fabricate a
 * widget — this page reads viewer state and renders accordingly.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity, BadgePercent, BellRing, FileUp, LifeBuoy, MapPin, Package,
  RefreshCw, Sparkles, TicketPercent, Truck, UserRound,
} from "lucide-react";
import { Shell } from "./Shell";
import { Card, Stat, StatusPill, toneForStatus, MoneyText, Banner, ProgressRing, EmptyState, Timeline } from "@/components/ui";
import { CampaignLabel, assertCreativeClassRenderable } from "@/components/ui/ads";
import { resolveBuyer } from "@/lib/session";
import { readLiveProducts } from "@/lib/catalog";
import { daysUntil, type ActivityEvent } from "./_lib/data";
import { readLiveCoupons, LAUNCH_COUPONS } from "@/lib/commerce";
import { readAddresses } from "@/lib/engage";
import { applyCoupon } from "../(site)/cart/actions";
import { getSession } from "@/lib/auth-lite";
import { ordersForBuyer, type OrderStatus } from "@/lib/orders";
import { balancePaise, ledger } from "@/lib/wallet";
import { myPrescriptions } from "@/lib/prescriptions";
import { notificationsFor } from "@/lib/notify";
import { subscriptionCount } from "@/lib/subscriptions";

export const metadata: Metadata = { title: "My Account" };
export const dynamic = "force-dynamic";

const I = { size: 16, strokeWidth: 2.2 } as const;

/** Card-title chrome: lucide icon + text, no decorative emoji. */
function TitleIcon({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="vh-row" style={{ gap: 8 }}>
      <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)" }}>{icon}</span>
      {children}
    </span>
  );
}

const QUICK_ACTIONS = [
  { href: "/account/orders", label: "Track order", icon: <Truck size={18} strokeWidth={2.2} /> },
  { href: "/account/medical", label: "Upload prescription", icon: <FileUp size={18} strokeWidth={2.2} /> },
  { href: "/account/subscriptions", label: "Manage subscription", icon: <RefreshCw size={18} strokeWidth={2.2} /> },
  { href: "/account/support", label: "Get support", icon: <LifeBuoy size={18} strokeWidth={2.2} /> },
];

export default async function AccountHomePage() {
  const viewer = await resolveBuyer();
  const session = await getSession();
  const email = session?.email ?? "buyer@example.in";
  const firstName = viewer.firstName;

  // ── Real buyer-specific data (server stores, this buyer only) ──────────
  const allOrders = await ordersForBuyer(email);
  const myOrders = allOrders.slice(0, 3);
  const walletBalance = await balancePaise(email);
  const lastTxn = (await ledger(email))[0];
  const rx = await myPrescriptions(email);
  const notes = (await notificationsFor("buyer", email)).slice(0, 6);
  const subCount = await subscriptionCount(email);

  // Profile completeness — derived from this buyer's REAL state, not a fixed
  // estimate: each facet is a signal the server actually holds.
  const addresses = await readAddresses();
  const facets = [
    { ok: Boolean(session?.name), label: "your name" },
    { ok: allOrders.length > 0, label: "a first order" },
    { ok: addresses.length > 0, label: "a delivery address" },
    { ok: viewer.consents.marketing || viewer.consents.personalisation || viewer.hasRx, label: "your preferences" },
  ];
  const profileCompletePct = Math.round((facets.filter((f) => f.ok).length / facets.length) * 100);
  const missingFacets = facets.filter((f) => !f.ok).map((f) => f.label);

  // Rx expiry (W1): computed from the buyer's real prescriptions.
  const approvedRx = rx.find((r) => r.status === "APPROVED");
  const rxExpiryDays = approvedRx ? daysUntil(approvedRx.validTill) : null;
  const hasRx = !!approvedRx;
  const showRxExpiryBanner = hasRx && rxExpiryDays !== null && rxExpiryDays <= 14;

  // Pending / action-needed items — DERIVED from real state, never synthetic.
  const IN_FLIGHT = new Set<OrderStatus>(["PLACED", "ACCEPTED", "PACKED", "SHIPPED"]);
  const pendingActions: { id: string; label: string; tone: "warn" | "info"; href: string }[] = [];
  for (const o of allOrders.filter((o) => o.status === "SHIPPED").slice(0, 2)) {
    pendingActions.push({ id: `d-${o.reference}`, label: `Track order ${o.reference} — on its way`, tone: "warn", href: `/account/orders/live-${o.reference}/track` });
  }
  if (rx.some((r) => r.status === "PENDING_REVIEW")) {
    pendingActions.push({ id: "rx-review", label: "A prescription is under pharmacist review", tone: "info", href: "/account/medical" });
  }

  // A1: recommendations are built from the LIVE catalogue, filtered to the
  // viewer's permitted classes. permittedClasses() never includes MED_CANNABIS
  // for a buyer without a verified Rx — the product is ABSENT from this array,
  // not filtered out in the component and not shown blurred/locked. There is
  // nothing here to hide. In-stock first, then by rating.
  const recommended = (await readLiveProducts())
    .filter((p) => viewer.permittedClasses.includes(p.cls))
    .sort((a, b) => (b.stockQty > 0 ? 1 : 0) - (a.stockQty > 0 ? 1 : 0) || b.rating - a.rating)
    .slice(0, 4);

  // Personalisation consent gates offers vs. a generic best-sellers rail.
  const showPersonalisedOffers = viewer.consents.personalisation;

  // Offers come from the LIVE coupon store (admin-managed) — enabled, unexpired,
  // under its usage cap. A1: a MED_CANNABIS coupon can never surface here, and
  // the render still asserts per-offer below rather than filtering silently.
  const CLS_LABEL: Record<string, string> = { HEMP_FOOD: "Hemp Food", AYURVEDA: "Ayurveda", CBD_WELLNESS: "CBD Wellness" };
  const liveOffers = Object.entries(await readLiveCoupons())
    .filter(([, c]) => c.cls !== "MED_CANNABIS")
    // Feature admin-created coupons (not part of the launch set) ahead of the
    // evergreen launch coupons, so a freshly-created promo actually surfaces.
    .sort(([a], [b]) => (a in LAUNCH_COUPONS ? 1 : 0) - (b in LAUNCH_COUPONS ? 1 : 0))
    .slice(0, 4)
    .map(([code, c]) => ({
      id: code,
      code,
      headline: c.label,
      detail: c.cls ? `Applies to ${CLS_LABEL[c.cls] ?? c.cls} products.` : "Applies storewide across eligible items.",
      cls: c.cls,
      endsOn: c.validTo ?? null,
      minSpendPaise: c.minPaise > 0 ? c.minPaise : null,
    }));

  // Recent activity from the real notification store (A4 reads surface here too).
  const activity: ActivityEvent[] = notes.length
    ? notes.map((n, i) => ({ label: n.title, at: n.createdAt.slice(0, 10), state: i === 0 ? "current" : "done" }))
    : [{ label: "No recent activity yet — your orders and alerts will appear here.", at: "", state: "done" }];
  const inFlightCount = allOrders.filter((o) => IN_FLIGHT.has(o.status)).length;

  return (
    <Shell active="/account" breadcrumb={["My Account"]} title={`Welcome back, ${firstName}`}>
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        {/* Widget rank 1: Rx expiry (only rendered when it applies — absent for this viewer, who has no active Rx) */}
        {showRxExpiryBanner && (
          <Banner severity="warn" title="Your prescription expires soon">
            Renew before it lapses or your Medical Cannabis subscriptions will auto-pause.{" "}
            <Link href="/account/medical">Manage prescription →</Link>
          </Banner>
        )}

        {/* Quick actions — navigation chrome, not a ranked widget */}
        <nav className="vh-grid cols-4" aria-label="Quick actions">
          {QUICK_ACTIONS.map((qa) => (
            <Link
              key={qa.href}
              href={qa.href}
              className="vh-card vh-row"
              aria-label={qa.label}
              style={{ gap: 12, padding: 16, color: "var(--vh-ink)", fontWeight: 700, fontSize: ".88rem" }}
            >
              <span
                aria-hidden
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: "color-mix(in srgb, var(--vh-accent) 12%, transparent)",
                  color: "var(--vh-accent)",
                }}
              >
                {qa.icon}
              </span>
              {qa.label}
            </Link>
          ))}
        </nav>

        {/* Widget rank 2/3: welcome + pending actions */}
        <div className="vh-grid cols-2">
          <Card title={<TitleIcon icon={<UserRound {...I} />}>Your account</TitleIcon>}>
            <div className="vh-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="vh-row" style={{ gap: 8, marginBottom: 8 }}>
                  <StatusPill tone="ok">{viewer.membershipTier} member</StatusPill>
                  {viewer.roles.includes("ROLE_BUYER_VERIFIED") && <StatusPill tone="ok">Verified</StatusPill>}
                </div>
                <p className="muted small" style={{ margin: 0 }}>
                  Profile {profileCompletePct}% complete{missingFacets.length > 0 ? ` — add ${missingFacets.slice(0, 2).join(" and ")} to reach 100%.` : " — everything's set."}
                </p>
                <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/account/profile" style={{ marginTop: 8, display: "inline-flex" }}>
                  Complete profile
                </Link>
              </div>
              <ProgressRing percent={profileCompletePct} />
            </div>
          </Card>

          <Card
            title={<TitleIcon icon={<BellRing {...I} />}>Needs your attention</TitleIcon>}
            action={<StatusPill tone={pendingActions.length ? "warn" : "ok"}>{pendingActions.length} open</StatusPill>}
          >
            {pendingActions.length === 0 ? (
              <EmptyState icon="✅" headline="You're all caught up" />
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                {pendingActions.map((a) => (
                  <li key={a.id} className="vh-row-between">
                    <span className="vh-row" style={{ gap: 8 }}>
                      <StatusPill tone={a.tone}>Action</StatusPill>
                      <span className="small">{a.label}</span>
                    </span>
                    <Link className="small" href={a.href}>Resolve →</Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Widget rank 4: recent orders */}
        <Card
          title={<TitleIcon icon={<Package {...I} />}>Recent orders</TitleIcon>}
          action={<Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/account/orders">View all</Link>}
        >
          {myOrders.length === 0 ? (
            <EmptyState icon="📦" headline="No orders yet" cta={{ label: "Start shopping", href: "/" }} />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {myOrders.map((o) => (
                <li key={o.reference} className="vh-row-between" style={{ borderBottom: "1px solid var(--vh-line)", paddingBottom: 8 }}>
                  <span className="vh-row" style={{ gap: 12 }}>
                    <span aria-hidden style={{ fontSize: "1.4rem" }}>{o.items[0]?.emoji ?? "📦"}</span>
                    <span>
                      <div style={{ fontWeight: 600 }}>{o.reference}</div>
                      <div className="small muted">
                        {o.items.map((it) => it.title).join(", ")} · placed {o.placedAt.slice(0, 10)}
                      </div>
                    </span>
                  </span>
                  <span className="vh-row" style={{ gap: 8 }}>
                    <StatusPill tone={toneForStatus(o.status)}>{o.status.replace(/_/g, " ")}</StatusPill>
                    <MoneyText paise={o.totalPaise} />
                    <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/account/orders/live-${o.reference}`}>
                      {o.status === "DELIVERED" ? (
                        "View"
                      ) : (
                        <span className="vh-row" style={{ gap: 6 }}><MapPin size={14} strokeWidth={2.2} aria-hidden />Track</span>
                      )}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Widget rank 5/6/7: subscriptions, wallet (with trend), rewards */}
        <div className="vh-grid cols-3">
          <Card title={<TitleIcon icon={<RefreshCw {...I} />}>Subscriptions</TitleIcon>}>
            <p className="small muted" style={{ marginBottom: 8 }}>
              {subCount.active > 0
                ? `${subCount.active} active subscription${subCount.active === 1 ? "" : "s"}.`
                : "Set up a repeat delivery for the things you reorder."}
            </p>
            <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/account/subscriptions">Manage subscriptions</Link>
          </Card>
          <Card>
            <div className="vh-stat">
              <span className="vh-stat-label">Wallet balance</span>
              <span className="vh-stat-value tabular"><MoneyText paise={walletBalance} /></span>
              {lastTxn && (
                <span className={lastTxn.amountPaise >= 0 ? "vh-stat-delta-up" : "muted small"}>
                  {lastTxn.amountPaise >= 0 ? "▲ " : ""}{lastTxn.note}
                </span>
              )}
            </div>
            <Link className="small" href="/account/wallet" style={{ display: "inline-block", marginTop: 8 }}>Open wallet →</Link>
          </Card>
          <Stat label="Open orders" value={String(inFlightCount)} delta={{ dir: "up", text: `${allOrders.length} lifetime` }} />
        </div>

        {/* Activity timeline — companion to the ranked widgets, placed after wallet */}
        <Card
          title={<TitleIcon icon={<Activity {...I} />}>Recent activity</TitleIcon>}
          action={<span className="small muted">We notify you whenever your records are viewed</span>}
        >
          <Timeline nodes={activity} />
        </Card>

        {/* Widget rank 8: recommendations — A1: MED_CANNABIS is structurally absent, never filtered client-side */}
        <Card
          title={<TitleIcon icon={<Sparkles {...I} />}>Recommended for you</TitleIcon>}
          action={<Link className="small" href="/">Browse products →</Link>}
        >
          <div className="vh-grid cols-4">
            {recommended.map((p) => (
              <div key={p.id} className="vh-card" style={{ padding: 16 }}>
                <div aria-hidden style={{ fontSize: "1.8rem", marginBottom: 8 }}>{p.emoji}</div>
                <div className="small" style={{ fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                <div className="small muted" style={{ marginBottom: 8 }}>{p.seller} · ★ {p.rating}</div>
                <MoneyText paise={p.pricePaise} />
              </div>
            ))}
          </div>
        </Card>

        {/* Widget rank 9: personalised offers, gated on consent */}
        <Card
          title={
            <TitleIcon icon={<BadgePercent {...I} />}>
              {showPersonalisedOffers ? "Offers for you" : "Best sellers"}
            </TitleIcon>
          }
          action={<span className="small muted">Sponsored</span>}
        >
          {showPersonalisedOffers ? (
            <>
              {liveOffers.length === 0 ? (
                <p className="small muted" style={{ margin: 0 }}>No active offers right now — check back soon.</p>
              ) : (
              <div className="vh-grid cols-2">
                {liveOffers.map((offer) => {
                  // A1 render guard: a MED_CANNABIS creative can never reach this
                  // surface — the assert throws rather than filtering silently.
                  // Storewide coupons carry no class and need no class assertion.
                  if (offer.cls) assertCreativeClassRenderable(offer.cls as Parameters<typeof assertCreativeClassRenderable>[0]);
                  return (
                    <div key={offer.id} className="vh-card" style={{ padding: 16 }}>
                      <div className="vh-row-between" style={{ marginBottom: 8 }}>
                        <CampaignLabel>Sponsored</CampaignLabel>
                        <span className="small muted">{offer.endsOn ? `Ends ${offer.endsOn}` : "Ongoing"}</span>
                      </div>
                      <div className="vh-row" style={{ gap: 8, marginBottom: 8 }}>
                        <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)" }}>
                          <TicketPercent size={18} strokeWidth={2.2} />
                        </span>
                        <strong className="mono" style={{ fontSize: "1.05rem", letterSpacing: ".04em" }}>{offer.code}</strong>
                      </div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{offer.headline}</div>
                      <p className="small muted" style={{ margin: "0 0 8px" }}>{offer.detail}</p>
                      {offer.minSpendPaise !== null && (
                        <p className="small muted" style={{ margin: "0 0 8px" }}>
                          Min. spend <MoneyText paise={offer.minSpendPaise} />
                        </p>
                      )}
                      <form action={applyCoupon}>
                        <input type="hidden" name="code" value={offer.code} />
                        <button type="submit" className="vh-btn vh-btn-sm vh-btn-primary">Apply to cart</button>
                      </form>
                    </div>
                  );
                })}
              </div>
              )}
              <p className="small muted" style={{ margin: "8px 0 0" }}>
                Promotional offers only ever cover Hemp Food, Ayurveda and CBD Wellness. Medical Cannabis is
                never promoted, to anyone.
              </p>
            </>
          ) : (
            // No personalisation consent → a non-personalised "best sellers" rail
            // instead of a targeted offer, rather than personalising anyway.
            <div className="vh-grid cols-4">
              {recommended.map((p) => (
                <div key={p.id} className="vh-card" style={{ padding: 16 }}>
                  <div aria-hidden style={{ fontSize: "1.8rem", marginBottom: 8 }}>{p.emoji}</div>
                  <div className="small" style={{ fontWeight: 600 }}>{p.title}</div>
                  <MoneyText paise={p.pricePaise} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
}
