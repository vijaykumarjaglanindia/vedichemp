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
import { Sparkline } from "@/components/ui/charts";
import { CampaignLabel, assertCreativeClassRenderable } from "@/components/ui/ads";
import { currentBuyer } from "@/lib/session";
import { ORDERS, classProducts } from "@/lib/sample";
import { CAMPAIGN_OFFERS, ACTIVITY, WALLET_TREND, WALLET_BALANCE_PAISE } from "./_lib/data";
import { applyCoupon } from "../(site)/cart/actions";

export const metadata: Metadata = { title: "My Account" };

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
  { href: "/account/medical", label: "Upload Rx", icon: <FileUp size={18} strokeWidth={2.2} /> },
  { href: "/account/subscriptions", label: "Manage subscription", icon: <RefreshCw size={18} strokeWidth={2.2} /> },
  { href: "/account/support", label: "Get support", icon: <LifeBuoy size={18} strokeWidth={2.2} /> },
];

export default function AccountHomePage() {
  const viewer = currentBuyer();

  // W-recent-orders: this buyer's own orders only, most recent first.
  const myOrders = ORDERS.filter((o) => o.buyer === "Ananya S." || o.buyer === undefined).slice(0, 3);

  // Profile completeness drives W1 (ProgressRing). Presentation-only estimate;
  // the server computes the real percentage from which profile fields are set.
  const profileCompletePct = 72;

  // Pending / action-needed items — synthetic for the demo viewer. In prod
  // this comes from a server-side aggregation (unpaid orders, undelivered
  // returns, KYC nudges, etc.), never computed in the browser.
  const pendingActions = [
    { id: "pa1", label: "Confirm delivery of order VH2026070233", tone: "warn" as const, href: "/account/orders/o3" },
    { id: "pa2", label: "Add a backup mobile number for account recovery", tone: "info" as const, href: "/account/profile" },
  ];

  // A1: recommendations are built from classProducts(viewer.permittedClasses).
  // permittedClasses() never includes MED_CANNABIS for a buyer without a
  // verified Rx — the product is ABSENT from this array, not filtered out in
  // the component and not shown blurred/locked. There is nothing here to hide.
  const recommended = classProducts(viewer.permittedClasses).slice(0, 4);

  // Personalisation consent gates offers vs. a generic best-sellers rail.
  const showPersonalisedOffers = viewer.consents.personalisation;

  const rxExpiryDays = viewer.rxDaysToExpiry;
  const showRxExpiryBanner = viewer.hasRx && rxExpiryDays !== null && rxExpiryDays <= 14;

  return (
    <Shell active="/account" breadcrumb={["My Account"]} title={`Welcome back, ${viewer.firstName}`}>
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
                  Profile {profileCompletePct}% complete — add your date of birth and a delivery address to reach 100%.
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
                <li key={o.id} className="vh-row-between" style={{ borderBottom: "1px solid var(--vh-line)", paddingBottom: 8 }}>
                  <span className="vh-row" style={{ gap: 12 }}>
                    <span aria-hidden style={{ fontSize: "1.4rem" }}>{o.items[0]?.emoji ?? "📦"}</span>
                    <span>
                      <div style={{ fontWeight: 600 }}>{o.reference}</div>
                      <div className="small muted">
                        {o.items.map((it) => it.title).join(", ")} · placed {o.placedAt}
                        {o.eta ? ` · ETA ${o.eta}` : ""}
                      </div>
                    </span>
                  </span>
                  <span className="vh-row" style={{ gap: 8 }}>
                    <StatusPill tone={toneForStatus(o.status)}>{o.status.replace(/_/g, " ")}</StatusPill>
                    <MoneyText paise={o.totalPaise} />
                    <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/account/orders/${o.id}`}>
                      {o.status === "DELIVERED" ? (
                        "Buy again"
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
          <Card title={<TitleIcon icon={<RefreshCw {...I} />}>Active subscriptions</TitleIcon>}>
            <p className="small muted" style={{ marginBottom: 8 }}>2 active · next delivery in 3 days</p>
            <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/account/subscriptions">Manage subscriptions</Link>
          </Card>
          <Card>
            <div className="vh-stat">
              <span className="vh-stat-label">Wallet balance</span>
              <span className="vh-stat-value tabular"><MoneyText paise={WALLET_BALANCE_PAISE} /></span>
              <span className="vh-stat-delta-up">▲ ₹250 cashback added</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <Sparkline points={WALLET_TREND} width={200} height={40} label="Wallet balance trend, last 7 weeks" />
            </div>
            <Link className="small" href="/account/wallet" style={{ display: "inline-block", marginTop: 8 }}>Open wallet →</Link>
          </Card>
          <Stat label="Reward points" value="1,240 pts" delta={{ dir: "up", text: "120 pts this month" }} />
        </div>

        {/* Activity timeline — companion to the ranked widgets, placed after wallet */}
        <Card
          title={<TitleIcon icon={<Activity {...I} />}>Recent activity</TitleIcon>}
          action={<span className="small muted">Sensitive reads always appear here and notify you (A4)</span>}
        >
          <Timeline nodes={ACTIVITY} />
        </Card>

        {/* Widget rank 8: recommendations — A1: MED_CANNABIS is structurally absent, never filtered client-side */}
        <Card
          title={<TitleIcon icon={<Sparkles {...I} />}>Recommended for you</TitleIcon>}
          action={<Link className="small" href="/">Browse catalogue →</Link>}
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
          action={<span className="small muted">Placements configured in Admin → Ads</span>}
        >
          {showPersonalisedOffers ? (
            <>
              <div className="vh-grid cols-2">
                {CAMPAIGN_OFFERS.map((offer) => {
                  // A1 render guard: a MED_CANNABIS creative can never reach this
                  // surface — the assert throws rather than filtering silently.
                  assertCreativeClassRenderable(offer.cls);
                  return (
                    <div key={offer.id} className="vh-card" style={{ padding: 16 }}>
                      <div className="vh-row-between" style={{ marginBottom: 8 }}>
                        <CampaignLabel>Campaign</CampaignLabel>
                        <span className="small muted">Ends {offer.endsOn}</span>
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
              <p className="small muted" style={{ margin: "8px 0 0" }}>
                Campaign offers only ever cover Hemp Food, Ayurveda and CBD Wellness. Medical Cannabis is
                never promoted, to anyone (A1).
              </p>
            </>
          ) : (
            // No personalisation consent → a non-personalised "best sellers" rail
            // instead of a targeted offer, rather than personalising anyway.
            <div className="vh-grid cols-4">
              {classProducts(viewer.permittedClasses).slice(0, 4).map((p) => (
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
