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
import { Shell } from "./Shell";
import { Card, Stat, StatusPill, toneForStatus, MoneyText, Banner, ProgressRing, EmptyState } from "@/components/ui";
import { currentBuyer } from "@/lib/session";
import { ORDERS, classProducts } from "@/lib/sample";

export const metadata: Metadata = { title: "My Account" };

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
      <div className="vh-grid" style={{ gap: 18 }}>
        {/* Widget rank 1: Rx expiry (only rendered when it applies — absent for this viewer, who has no active Rx) */}
        {showRxExpiryBanner && (
          <Banner severity="warn" title="Your prescription expires soon">
            Renew before it lapses or your Medical Cannabis subscriptions will auto-pause.{" "}
            <a href="/account/medical">Manage prescription →</a>
          </Banner>
        )}

        {/* Widget rank 2/3: welcome + pending actions */}
        <div className="vh-grid cols-2">
          <Card title="Your account">
            <div className="vh-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="vh-row" style={{ gap: 8, marginBottom: 6 }}>
                  <StatusPill tone="ok">{viewer.membershipTier} member</StatusPill>
                  {viewer.roles.includes("ROLE_BUYER_VERIFIED") && <StatusPill tone="ok">Verified</StatusPill>}
                </div>
                <p className="muted small" style={{ margin: 0 }}>
                  Profile {profileCompletePct}% complete — add your date of birth and a delivery address to reach 100%.
                </p>
                <a className="vh-btn vh-btn-sm vh-btn-ghost" href="/account/profile" style={{ marginTop: 10, display: "inline-block" }}>
                  Complete profile
                </a>
              </div>
              <ProgressRing percent={profileCompletePct} />
            </div>
          </Card>

          <Card title="Needs your attention" action={<StatusPill tone={pendingActions.length ? "warn" : "ok"}>{pendingActions.length} open</StatusPill>}>
            {pendingActions.length === 0 ? (
              <EmptyState icon="✅" headline="You're all caught up" />
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
                {pendingActions.map((a) => (
                  <li key={a.id} className="vh-row-between">
                    <span className="vh-row" style={{ gap: 8 }}>
                      <StatusPill tone={a.tone}>Action</StatusPill>
                      <span className="small">{a.label}</span>
                    </span>
                    <a className="small" href={a.href}>Resolve →</a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Widget rank 4: recent orders */}
        <Card
          title="Recent orders"
          action={<a className="vh-btn vh-btn-sm vh-btn-ghost" href="/account/orders">View all</a>}
        >
          {myOrders.length === 0 ? (
            <EmptyState icon="📦" headline="No orders yet" cta={{ label: "Start shopping", href: "/" }} />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {myOrders.map((o) => (
                <li key={o.id} className="vh-row-between" style={{ borderBottom: "1px solid var(--vh-line)", paddingBottom: 12 }}>
                  <span className="vh-row" style={{ gap: 10 }}>
                    <span aria-hidden style={{ fontSize: "1.4rem" }}>{o.items[0]?.emoji ?? "📦"}</span>
                    <span>
                      <div style={{ fontWeight: 600 }}>{o.reference}</div>
                      <div className="small muted">
                        {o.items.map((it) => it.title).join(", ")} · placed {o.placedAt}
                        {o.eta ? ` · ETA ${o.eta}` : ""}
                      </div>
                    </span>
                  </span>
                  <span className="vh-row" style={{ gap: 10 }}>
                    <StatusPill tone={toneForStatus(o.status)}>{o.status.replace(/_/g, " ")}</StatusPill>
                    <MoneyText paise={o.totalPaise} />
                    <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/account/orders/${o.id}`}>
                      {o.status === "DELIVERED" ? "Buy again" : "Track"}
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Widget rank 5/6/7: subscriptions, wallet, rewards */}
        <div className="vh-grid cols-3">
          <Card title="Active subscriptions">
            <p className="small muted" style={{ marginBottom: 10 }}>2 active · next delivery in 4 days</p>
            <a className="vh-btn vh-btn-sm vh-btn-ghost" href="/account/subscriptions">Manage subscriptions</a>
          </Card>
          <Stat label="Wallet balance" value={<MoneyText paise={128450} />} delta={{ dir: "up", text: "₹250 cashback added" }} />
          <Stat label="Reward points" value="1,240 pts" delta={{ dir: "up", text: "120 pts this month" }} />
        </div>

        {/* Widget rank 8: recommendations — A1: MED_CANNABIS is structurally absent, never filtered client-side */}
        <Card title="Recommended for you" action={<a className="small" href="/">Browse catalogue →</a>}>
          <div className="vh-grid cols-4">
            {recommended.map((p) => (
              <div key={p.id} className="vh-card" style={{ padding: 14 }}>
                <div aria-hidden style={{ fontSize: "1.8rem", marginBottom: 6 }}>{p.emoji}</div>
                <div className="small" style={{ fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                <div className="small muted" style={{ marginBottom: 8 }}>{p.seller} · ★ {p.rating}</div>
                <MoneyText paise={p.pricePaise} />
              </div>
            ))}
          </div>
        </Card>

        {/* Widget rank 9: personalised offers, gated on consent */}
        <Card title={showPersonalisedOffers ? "Offers picked for you" : "Best sellers"}>
          {showPersonalisedOffers ? (
            <div className="vh-grid cols-3">
              <div className="vh-banner vh-banner-ok"><span aria-hidden>🎁</span><div><strong>FLAT15</strong> — 15% off Ayurveda essentials, based on your recent browsing.</div></div>
              <div className="vh-banner vh-banner-info"><span aria-hidden>🚚</span><div>Free shipping on your next Hemp Food order over ₹499.</div></div>
              <div className="vh-banner vh-banner-ok"><span aria-hidden>🔁</span><div>Subscribe to CBD Wellness Balm and save 10% every delivery.</div></div>
            </div>
          ) : (
            // No personalisation consent → a non-personalised "best sellers" rail
            // instead of a targeted offer, rather than personalising anyway.
            <div className="vh-grid cols-4">
              {classProducts(viewer.permittedClasses).slice(0, 4).map((p) => (
                <div key={p.id} className="vh-card" style={{ padding: 14 }}>
                  <div aria-hidden style={{ fontSize: "1.8rem", marginBottom: 6 }}>{p.emoji}</div>
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
