/**
 * VEDIC HEMP — SUBSCRIPTIONS (§1.8)
 *
 * Real per-buyer subscriptions from src/lib/subscriptions.ts. Skip is
 * idempotent (repeated taps never double-skip) with an undo; a regulated
 * subscription whose prescription requirement isn't met is shown PAUSED —
 * computed here from the buyer's live prescriptions, never silently shipped.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Pause, SkipForward, XCircle, PlusCircle } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus, MoneyText, Banner, EmptyState } from "@/components/ui";
import { getSession } from "@/lib/auth-lite";
import { daysUntil } from "../_lib/data";
import { mySubscriptions, cadenceLabel, CADENCES } from "@/lib/subscriptions";
import { myPrescriptions } from "@/lib/prescriptions";
import { readLiveProducts } from "@/lib/catalog";
import { permittedClasses } from "@/lib/compliance";
import { subscriptionAction, createSubscriptionAction } from "./actions";

export const metadata: Metadata = { title: "Subscriptions" };
export const dynamic = "force-dynamic";

const DONE_NOTES: Record<string, string> = {
  create: "Subscription created — your first delivery is scheduled. Skip or pause any time.",
  skip: "Next delivery skipped — undoable any time before it ships (repeated taps never double-skip).",
  unskip: "Skip undone — the next delivery ships as scheduled.",
  pause: "Subscription paused — resume any time; nothing ships while paused.",
  resume: "Subscription resumed.",
  cancel: "Subscription cancelled — past orders and invoices stay in your history.",
};

const ERR_NOTES: Record<string, string> = {
  product: "Pick a product that's currently available to subscribe.",
  cadence: "Choose a delivery frequency.",
  duplicate: "You already have an active subscription for that product.",
  terminal: "That subscription is cancelled and can't be changed.",
  state: "That action doesn't apply to the subscription's current state.",
};

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; err?: string }>;
}) {
  const { done, err } = await searchParams;
  const email = (await getSession())?.email ?? "buyer@example.in";
  const subs = await mySubscriptions(email);
  const hasRx = (await myPrescriptions(email)).some((r) => r.status === "APPROVED");

  // Products the buyer can subscribe to that they aren't already subscribed to.
  const permitted = permittedClasses({ hasRx: false });
  const subscribedIds = new Set(subs.filter((s) => s.status !== "CANCELLED").map((s) => s.productId));
  const subscribable = (await readLiveProducts())
    .filter((p) => permitted.includes(p.cls) && !subscribedIds.has(p.slug))
    .slice(0, 40);

  return (
    <Shell active="/account/subscriptions" breadcrumb={["My Account", "Subscriptions"]} title="Subscriptions">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        {done && DONE_NOTES[done] && <Banner severity="ok">{DONE_NOTES[done]}</Banner>}
        {err && ERR_NOTES[err] && <Banner severity="danger" title="Not applied">{ERR_NOTES[err]}</Banner>}
        <Banner severity="info" title="Skip and pause are safe to undo" icon="🔁">
          Skipping a delivery is idempotent (repeated taps never double-skip) and can be undone before it
          ships. If a subscription's prescription requirement lapses, the subscription is automatically
          <strong> paused</strong> — never cancelled or silently shipped — until you renew.
        </Banner>

        {/* Create a subscription */}
        <Card title={<span className="vh-row" style={{ gap: 8 }}><PlusCircle size={16} strokeWidth={2.2} aria-hidden /> Subscribe &amp; save</span>}>
          {subscribable.length === 0 ? (
            <p className="small muted" style={{ margin: 0 }}>You&rsquo;re subscribed to everything currently available. Browse the <Link href="/catalogue">catalogue</Link> for more.</p>
          ) : (
            <form action={createSubscriptionAction} className="vh-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label className="vh-field" style={{ flex: "2 1 240px" }}>
                <span className="vh-label">Product</span>
                <select className="vh-select" name="productSlug" required defaultValue="">
                  <option value="" disabled>Choose a product…</option>
                  {subscribable.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.emoji} {p.title} — ₹{(p.pricePaise / 100).toLocaleString("en-IN")}</option>
                  ))}
                </select>
              </label>
              <label className="vh-field" style={{ flex: "1 1 160px" }}>
                <span className="vh-label">Delivery every</span>
                <select className="vh-select" name="cadenceDays" defaultValue="28">
                  {CADENCES.map((d) => <option key={d} value={d}>{cadenceLabel(d)}</option>)}
                </select>
              </label>
              <button type="submit" className="vh-btn vh-btn-sm vh-btn-primary">Start subscription</button>
            </form>
          )}
        </Card>

        {subs.length === 0 ? (
          <EmptyState icon="🔁" headline="No subscriptions yet" sub="Set one up above to get your regulars delivered on a schedule." />
        ) : (
          <div className="vh-grid cols-2">
            {subs.map((s) => {
              const autoPaused = s.regulated && !hasRx && s.status !== "CANCELLED";
              const displayStatus = s.status === "CANCELLED" ? "CANCELLED" : autoPaused ? "PAUSED" : s.status;
              const skipped = s.skippedNext;
              const cancelled = displayStatus === "CANCELLED";
              const paused = displayStatus === "PAUSED";
              const days = daysUntil(s.nextDeliveryAt);
              return (
                <Card
                  key={s.id}
                  title={<span className="vh-row" style={{ gap: 8 }}><span aria-hidden>{s.emoji}</span>{s.product}</span>}
                  action={<StatusPill tone={toneForStatus(displayStatus)}>{displayStatus}</StatusPill>}
                >
                  {!autoPaused && !cancelled && !paused && (
                    <div className="vh-row" style={{ gap: 8, marginBottom: 8, color: "var(--vh-accent)", fontWeight: 700, fontSize: ".84rem" }}>
                      <CalendarClock size={16} strokeWidth={2.2} aria-hidden />
                      {skipped ? "Next delivery skipped — following cycle ships as usual" : `Next delivery ${days > 0 ? `in ${days} day${days === 1 ? "" : "s"}` : "today"}`}
                    </div>
                  )}
                  <div className="vh-row-between" style={{ marginBottom: 8 }}>
                    <span className="small muted">Cadence</span>
                    <span className="small">{cadenceLabel(s.cadenceDays)}</span>
                  </div>
                  <div className="vh-row-between" style={{ marginBottom: 8 }}>
                    <span className="small muted">Next delivery</span>
                    <span className="small">{autoPaused ? "Paused — awaiting valid Rx" : cancelled ? "—" : s.nextDeliveryAt}</span>
                  </div>
                  <div className="vh-row-between" style={{ marginBottom: 8 }}>
                    <span className="small muted">Price per delivery</span>
                    <MoneyText paise={s.pricePaise} />
                  </div>

                  {autoPaused && (
                    <Banner severity="warn" icon="⏳">
                      Auto-paused: this product requires a verified, unexpired prescription.{" "}
                      <Link href="/account/medical">Renew your Rx →</Link>
                    </Banner>
                  )}

                  {!cancelled && (
                    <div className="vh-row" style={{ gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                      <form action={subscriptionAction} style={{ display: "inline-flex" }}>
                        <input type="hidden" name="subId" value={s.id} />
                        <input type="hidden" name="op" value={skipped ? "unskip" : "skip"} />
                        <button type="submit" className="vh-btn vh-btn-sm vh-btn-ghost" disabled={paused || autoPaused}>
                          <span className="vh-row" style={{ gap: 6 }}>
                            <SkipForward size={14} strokeWidth={2.2} aria-hidden />{skipped ? "Undo skip" : "Skip next"}
                          </span>
                        </button>
                      </form>
                      <form action={subscriptionAction} style={{ display: "inline-flex" }}>
                        <input type="hidden" name="subId" value={s.id} />
                        <input type="hidden" name="op" value={paused && !autoPaused ? "resume" : "pause"} />
                        <button type="submit" className="vh-btn vh-btn-sm vh-btn-ghost" disabled={autoPaused} title={autoPaused ? "Auto-paused until a valid prescription is verified" : undefined}>
                          <span className="vh-row" style={{ gap: 6 }}>
                            <Pause size={14} strokeWidth={2.2} aria-hidden />
                            {autoPaused ? "Auto-paused (Rx)" : paused ? "Resume" : "Pause"}
                          </span>
                        </button>
                      </form>
                      <form action={subscriptionAction} style={{ display: "inline-flex" }}>
                        <input type="hidden" name="subId" value={s.id} />
                        <input type="hidden" name="op" value="cancel" />
                        <button type="submit" className="vh-btn vh-btn-sm vh-btn-danger">
                          <span className="vh-row" style={{ gap: 6 }}>
                            <XCircle size={14} strokeWidth={2.2} aria-hidden />Cancel
                          </span>
                        </button>
                      </form>
                    </div>
                  )}
                  <p className="small muted" style={{ margin: "8px 0 0" }}>
                    Skip is idempotent and undoable before the delivery ships.
                  </p>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
