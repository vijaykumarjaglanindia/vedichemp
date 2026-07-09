/**
 * VEDIC HEMP — SUBSCRIPTIONS (§1.8)
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus, MoneyText, Banner, EmptyState } from "@/components/ui";
import { currentBuyer } from "@/lib/session";

export const metadata: Metadata = { title: "Subscriptions" };

interface SampleSubscription {
  id: string; product: string; emoji: string; cadence: string; nextDelivery: string; pricePaise: number; status: string; regulated: boolean;
}

const SUBSCRIPTIONS: SampleSubscription[] = [
  { id: "sub1", product: "CBD Wellness Balm 30g", emoji: "🌿", cadence: "Every 4 weeks", nextDelivery: "2026-07-13", pricePaise: 149900, status: "ACTIVE", regulated: true },
  { id: "sub2", product: "Hemp Protein Powder 500g", emoji: "🥤", cadence: "Every 6 weeks", nextDelivery: "2026-07-20", pricePaise: 89900, status: "ACTIVE", regulated: false },
];

export default function SubscriptionsPage() {
  const viewer = currentBuyer();

  return (
    <Shell active="/account/subscriptions" breadcrumb={["My Account", "Subscriptions"]} title="Subscriptions">
      <div className="vh-grid" style={{ gap: 18 }}>
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
              return (
                <Card key={s.id} title={<span className="vh-row" style={{ gap: 8 }}><span aria-hidden>{s.emoji}</span>{s.product}</span>} action={<StatusPill tone={toneForStatus(displayStatus)}>{displayStatus}</StatusPill>}>
                  <div className="vh-row-between" style={{ marginBottom: 6 }}>
                    <span className="small muted">Cadence</span>
                    <span className="small">{s.cadence}</span>
                  </div>
                  <div className="vh-row-between" style={{ marginBottom: 6 }}>
                    <span className="small muted">Next delivery</span>
                    <span className="small">{autoPaused ? "Paused — awaiting valid Rx" : s.nextDelivery}</span>
                  </div>
                  <div className="vh-row-between" style={{ marginBottom: 12 }}>
                    <span className="small muted">Price per delivery</span>
                    <MoneyText paise={s.pricePaise} />
                  </div>

                  {autoPaused && (
                    <Banner severity="warn" icon="⏳">
                      Auto-paused: this product requires a verified, unexpired prescription.{" "}
                      <a href="/account/medical">Renew your Rx →</a>
                    </Banner>
                  )}

                  <div className="vh-row" style={{ gap: 8, marginTop: 12 }}>
                    <span className="vh-btn vh-btn-sm vh-btn-ghost" aria-disabled>Skip next</span>
                    <span className="vh-btn vh-btn-sm vh-btn-ghost" aria-disabled>{autoPaused ? "Cannot pause further" : "Pause"}</span>
                    <span className="vh-btn vh-btn-sm vh-btn-danger" aria-disabled>Cancel</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
