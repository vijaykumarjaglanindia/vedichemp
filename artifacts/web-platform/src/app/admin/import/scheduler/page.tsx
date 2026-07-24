/**
 * VEDIC HEMP — SYNC SCHEDULER.
 *
 * Sets how often each connected seller store is automatically re-synced. Every
 * cadence runs as a background job — but nothing here can publish anything: a
 * scheduled sync still lands products as DRAFT, a regulated (CBD) product cannot
 * sell until its lab report is approved (A2), and Medical Cannabis is never
 * fetched at all (A1). Changing a cadence is audited in the server action.
 */

import type { Metadata } from "next";
import { CalendarClock, CalendarDays, CalendarRange, Clock, MousePointerClick, RefreshCw, Save, Webhook } from "lucide-react";
import { Shell } from "@/app/admin/Shell";
import { ImpShell, ImpHero, HealthPill } from "@/app/admin/import/_ui";
import { Card, EmptyState } from "@/components/ui";
import { listStores } from "@/lib/import/store";
import { methodMeta } from "@/lib/import/connectors";
import { setScheduleAction } from "@/app/admin/import/actions";

export const metadata: Metadata = { title: "Sync Scheduler" };
export const dynamic = "force-dynamic";

const CADENCES = [
  { value: "manual", label: "Manual", Icon: MousePointerClick, blurb: "Never runs on its own — only when you press Sync now." },
  { value: "hourly", label: "Hourly", Icon: Clock, blurb: "Re-syncs every hour." },
  { value: "daily", label: "Daily", Icon: CalendarClock, blurb: "Re-syncs once a day." },
  { value: "weekly", label: "Weekly", Icon: CalendarRange, blurb: "Re-syncs once a week." },
  { value: "monthly", label: "Monthly", Icon: CalendarDays, blurb: "Re-syncs once a month." },
  { value: "realtime", label: "Real-time (webhook)", Icon: Webhook, blurb: "The store pushes each change to us the moment it happens." },
] as const;

export default async function SyncSchedulerPage() {
  const stores = await listStores();

  return (
    <Shell active="/admin/import/scheduler" breadcrumb={["Admin", "Marketplace", "Import"]} title="Sync Scheduler">
      <ImpShell>
        <ImpHero
          badge="Scheduler"
          title="Sync scheduler"
          sub="Choose how often each connected store is automatically re-synced. A cadence keeps the catalogue fresh on its own — you never have to remember to press Sync."
        />

        {stores.length === 0 ? (
          <Card>
            <EmptyState
              icon="⏱️"
              headline="No stores to schedule yet"
              sub="Connect a seller store first — then you can set it to re-sync hourly, daily, weekly, monthly or in real time."
              cta={{ label: "Connect a store", href: "/admin/import/wizard" }}
            />
          </Card>
        ) : (
          <div className="imp-grid cols-2">
            {stores.map((store) => {
              const method = methodMeta(store.method);
              const lastSync = store.lastSyncAt ? new Date(store.lastSyncAt).toLocaleString("en-IN") : "never synced";
              const selectId = `cadence-${store.id}`;
              return (
                <Card key={store.id} title={store.sellerName} action={<HealthPill health={store.health} />}>
                  <div className="small muted" style={{ marginBottom: 12 }}>
                    {method.name} · {lastSync}
                  </div>

                  <form action={setScheduleAction} className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <input type="hidden" name="id" value={store.id} />
                    <label htmlFor={selectId} className="small muted">Cadence</label>
                    <select id={selectId} name="cadence" className="vh-input" defaultValue={store.schedule ?? "manual"}>
                      {CADENCES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <button type="submit" className="vh-btn vh-btn-sm vh-btn-primary">
                      <Save size={14} aria-hidden /> Save cadence
                    </button>
                  </form>
                </Card>
              );
            })}
          </div>
        )}

        <Card title={<span className="vh-row" style={{ gap: 8 }}><RefreshCw size={16} aria-hidden /> How syncing works</span>}>
          <div style={{ display: "grid", gap: 10 }}>
            {CADENCES.map((c) => {
              const Icon = c.Icon;
              return (
                <div key={c.value} className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                  <span className="imp-chip on"><Icon size={12} aria-hidden /> {c.label}</span>
                  <span className="small muted">{c.blurb}</span>
                </div>
              );
            })}
          </div>

          <p className="small muted" style={{ marginTop: "var(--sp-4)" }}>
            Scheduled syncs run as background jobs with automatic retry, so a transient outage never loses a run.
            The importer does incremental / delta detection — it only touches products that actually changed —
            and every sync produces a change report covering new, updated and removed items plus price and stock deltas.
          </p>
        </Card>

        <div className="vh-banner vh-banner-info" role="note">
          <div>
            <strong>A schedule never publishes anything.</strong> However often a store re-syncs, every product still
            lands as <span className="mono">DRAFT</span>; a regulated (CBD) product cannot sell until its lab report is
            approved (A2); and Medical Cannabis is never imported by any cadence (A1).
          </div>
        </div>
      </ImpShell>
    </Shell>
  );
}
