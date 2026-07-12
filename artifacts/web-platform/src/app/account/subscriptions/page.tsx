/**
 * VEDIC HEMP — SUBSCRIPTIONS (§1.8)
 *
 * Skip is idempotent (repeated taps never double-skip) with a 2-hour undo
 * window; a regulated subscription whose Rx lapses auto-PAUSES server-side —
 * never cancelled, never silently shipped. This page renders those states.
 */

import type { Metadata } from "next";
import { CalendarClock, Pause, SkipForward, XCircle } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus, MoneyText, Banner, EmptyState } from "@/components/ui";
import { currentBuyer } from "@/lib/session";
import { SUBSCRIPTIONS, daysUntil } from "../_lib/data";
import { readSubOverrides, subscriptionAction } from "./actions";

export const metadata: Metadata = { title: "Subscriptions" };

const DONE_NOTES: Record<string, string> = {
  skip: "Next delivery skipped — undoable for 2 hours (repeated taps never double-skip).",
  unskip: "Skip undone — the next delivery ships as scheduled.",
  pause: "Subscription paused — resume any time; nothing ships while paused.",
  resume: "Subscription resumed.",
  cancel: "Subscription cancelled — past orders and invoices stay in your history.",
};

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const viewer = currentBuyer();
  const { done } = await searchParams;
  const overrides = await readSubOverrides();

  return (
    <Shell active="/account/subscriptions" breadcrumb={["My Account", "Subscriptions"]} title="Subscriptions">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        {done && DONE_NOTES[done] && <Banner severity="ok">{DONE_NOTES[done]}</Banner>}
        <Banner severity="info" title="Skip and pause are safe to undo" icon="🔁">
          Skipping a delivery is idempotent (repeated taps never double-skip) and can be undone for 2 hours
          from your notification. If a subscription's Medical Cannabis prescription expires, the
          subscription is automatically <strong>paused</strong> — never cancelled or silently shipped —
          until you renew.
        </Banner>

        {SUBSCRIPTIONS.length === 0 ? (
          <EmptyState icon="🔁" headline="No active subscriptions" cta={{ label: "Browse subscribe & save", href: "/" }} />
        ) : (
          <div className="vh-grid cols-2">
            {SUBSCRIPTIONS.map((s) => {
              const o = overrides[s.id] ?? {};
              const baseStatus = o.status ?? s.status;
              const autoPaused = s.regulated && !viewer.hasRx && baseStatus !== "CANCELLED";
              const displayStatus = baseStatus === "CANCELLED" ? "CANCELLED" : autoPaused ? "PAUSED" : baseStatus;
              const skipped = o.skipped === true;
              const cancelled = displayStatus === "CANCELLED";
              const paused = displayStatus === "PAUSED";
              const days = daysUntil(s.nextDelivery);
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
                    <span className="small">{s.cadence}</span>
                  </div>
                  <div className="vh-row-between" style={{ marginBottom: 8 }}>
                    <span className="small muted">Next delivery</span>
                    <span className="small">{autoPaused ? "Paused — awaiting valid Rx" : s.nextDelivery}</span>
                  </div>
                  <div className="vh-row-between" style={{ marginBottom: 8 }}>
                    <span className="small muted">Price per delivery</span>
                    <MoneyText paise={s.pricePaise} />
                  </div>

                  {autoPaused && (
                    <Banner severity="warn" icon="⏳">
                      Auto-paused: this product requires a verified, unexpired prescription.{" "}
                      <a href="/account/medical">Renew your Rx →</a>
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
                    Skip is idempotent and undoable for 2 hours after you're notified.
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
