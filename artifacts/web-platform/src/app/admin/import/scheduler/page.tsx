/**
 * VEDIC HEMP — SYNC SCHEDULER.
 *
 * Sets how often each connected seller store should be re-synced, and lets an
 * operator run the due syncs now. A cadence is a schedule, not a daemon: syncs
 * run when something triggers them — "Sync now", "Run due syncs", or an external
 * scheduler calling POST /api/v1/import/sync on a real cron. Whatever triggers a
 * sync, nothing here can publish: a sync still lands products as DRAFT, a
 * regulated (CBD) product cannot sell until its lab report is approved (A2), and
 * Medical Cannabis is never fetched at all (A1). Every action is audited server-side.
 */

import type { Metadata } from "next";
import { CalendarClock, CalendarDays, CalendarRange, Clock, MousePointerClick, RefreshCw, Save, Webhook, Zap } from "lucide-react";
import { Shell } from "@/app/admin/Shell";
import { ImpShell, ImpHero, HealthPill } from "@/app/admin/import/_ui";
import { Card, EmptyState, StatusPill } from "@/components/ui";
import { listStores } from "@/lib/import/store";
import { methodMeta } from "@/lib/import/connectors";
import { isDue } from "@/lib/import/service";
import { setScheduleAction, syncStoreAction, runDueSyncsAction } from "@/app/admin/import/actions";

export const metadata: Metadata = { title: "Sync Scheduler" };
export const dynamic = "force-dynamic";

const CADENCES = [
  { value: "manual", label: "Manual", Icon: MousePointerClick, blurb: "Never runs on its own — only when you press Sync now." },
  { value: "hourly", label: "Hourly", Icon: Clock, blurb: "Due every hour." },
  { value: "daily", label: "Daily", Icon: CalendarClock, blurb: "Due once a day." },
  { value: "weekly", label: "Weekly", Icon: CalendarRange, blurb: "Due once a week." },
  { value: "monthly", label: "Monthly", Icon: CalendarDays, blurb: "Due once a month." },
  { value: "realtime", label: "Real-time (webhook)", Icon: Webhook, blurb: "The store pushes each change to us the moment it happens — nothing to poll." },
] as const;

export default async function SyncSchedulerPage() {
  const stores = await listStores();
  const dueCount = stores.filter((s) => isDue(s)).length;

  return (
    <Shell active="/admin/import/scheduler" breadcrumb={["Admin", "Marketplace", "Import"]} title="Sync Scheduler">
      <ImpShell>
        <ImpHero
          badge="Scheduler"
          title="Sync scheduler"
          sub="Choose how often each connected store should be re-synced. A cadence sets when a store is due; running the due syncs keeps the catalogue fresh without re-importing by hand."
          actions={
            dueCount > 0 ? (
              <form action={runDueSyncsAction}>
                <button type="submit" className="vh-btn vh-btn-primary"><Zap size={15} aria-hidden /> Run {dueCount} due sync{dueCount === 1 ? "" : "s"} now</button>
              </form>
            ) : undefined
          }
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
              const due = isDue(store);
              const selectId = `cadence-${store.id}`;
              return (
                <Card
                  key={store.id}
                  title={store.sellerName}
                  action={due ? <StatusPill tone="warn">Due now</StatusPill> : <HealthPill health={store.health} />}
                >
                  <div className="small muted" style={{ marginBottom: 12 }}>
                    {method.name} · {lastSync}
                  </div>

                  <form action={setScheduleAction} className="vh-row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
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

                  <form action={syncStoreAction}>
                    <input type="hidden" name="id" value={store.id} />
                    <button type="submit" className="vh-btn vh-btn-sm vh-btn-ghost">
                      <RefreshCw size={13} aria-hidden /> Sync now
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
            A cadence marks a store <strong>due</strong> once its interval has elapsed; the due syncs then run when you press
            <em> Run due syncs</em> here, or when a scheduler calls <span className="mono">POST /api/v1/import/sync</span> on a
            real cron (that endpoint runs exactly the due stores). A sync re-fetches the catalogue, updates only the products
            that actually changed — price, stock and copy — and creates genuinely new ones as DRAFT, producing a change report
            of new, updated and unchanged items.
          </p>
        </Card>

        <div className="vh-banner vh-banner-info" role="note">
          <div>
            <strong>A sync never publishes anything.</strong> However a sync is triggered — by hand, by the due-sync run, or by a
            webhook — every new product still lands as <span className="mono">DRAFT</span>; an existing product's eligibility is
            never touched (only its price, stock and copy move); a regulated (CBD) product cannot sell until its lab report is
            approved (A2); and Medical Cannabis is never imported by any cadence (A1).
          </div>
        </div>
      </ImpShell>
    </Shell>
  );
}
