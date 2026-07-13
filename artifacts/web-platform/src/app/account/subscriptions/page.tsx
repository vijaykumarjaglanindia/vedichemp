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

export const metadata: Metadata = { title: "Subscriptions" };

export default function SubscriptionsPage() {
  const viewer = currentBuyer();

  return (
    <Shell active="/account/subscriptions" breadcrumb={["My Account", "Subscriptions"]} title="Subscriptions">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
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
              const autoPaused = s.regulated && !viewer.hasRx;
              const displayStatus = autoPaused ? "PAUSED" : s.status;
              const days = daysUntil(s.nextDelivery);
              return (
                <Card
                  key={s.id}
                  title={<span className="vh-row" style={{ gap: 8 }}><span aria-hidden>{s.emoji}</span>{s.product}</span>}
                  action={<StatusPill tone={toneForStatus(displayStatus)}>{displayStatus}</StatusPill>}
                >
                  {!autoPaused && (
                    <div className="vh-row" style={{ gap: 8, marginBottom: 8, color: "var(--vh-accent)", fontWeight: 700, fontSize: ".84rem" }}>
                      <CalendarClock size={16} strokeWidth={2.2} aria-hidden />
                      Next delivery {days > 0 ? `in ${days} day${days === 1 ? "" : "s"}` : "today"}
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

                  <div className="vh-row" style={{ gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                    <span className="vh-btn vh-btn-sm vh-btn-ghost" aria-disabled>
                      <span className="vh-row" style={{ gap: 6 }}>
                        <SkipForward size={14} strokeWidth={2.2} aria-hidden />Skip next
                      </span>
                    </span>
                    <span className="vh-btn vh-btn-sm vh-btn-ghost" aria-disabled>
                      <span className="vh-row" style={{ gap: 6 }}>
                        <Pause size={14} strokeWidth={2.2} aria-hidden />
                        {autoPaused ? "Cannot pause further" : "Pause"}
                      </span>
                    </span>
                    <span className="vh-btn vh-btn-sm vh-btn-danger" aria-disabled>
                      <span className="vh-row" style={{ gap: 6 }}>
                        <XCircle size={14} strokeWidth={2.2} aria-hidden />Cancel
                      </span>
                    </span>
                  </div>
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
