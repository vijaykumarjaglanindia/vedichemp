/**
 * VEDIC HEMP — PRODUCT IMPORT · admin home.
 *
 * The module's control tower: live import metrics, the connected-store roster,
 * recent activity, and the entry point to the import wizard. Every figure is
 * derived from the import store (lib/import/dashboard.ts) — no hand-typed KPIs.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { DownloadCloud, PlugZap, History, AlertTriangle, CheckCircle2, RefreshCw, Boxes, Wand2 } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, EmptyState } from "@/components/ui";
import { ImpShell, ImpHero, Metric, HealthPill, MethodGlyph } from "./_ui";
import { adminDashboard } from "@/lib/import/dashboard";
import { listStores } from "@/lib/import/store";
import { methodMeta } from "@/lib/import/connectors";

export const metadata: Metadata = { title: "Product Import" };
export const dynamic = "force-dynamic";

function ago(iso?: string): string {
  if (!iso) return "never";
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function ImportHomePage() {
  const [dash, stores] = await Promise.all([adminDashboard(), listStores()]);

  return (
    <Shell active="/admin/import" breadcrumb={["Admin", "Marketplace"]} title="Product Import & Sync">
      <ImpShell>
        <ImpHero
          badge="Marketplace · Import & Sync"
          title="Import & synchronize any seller's catalogue"
          sub="Connect a WooCommerce, Shopify, feed or custom store and pull products, images, pricing, inventory, variations and SEO — then keep them in sync automatically. Regulated products always land as drafts and pass the lab-report gate before they can sell."
          actions={
            <>
              <Link href="/admin/import/wizard" className="vh-btn vh-btn-primary"><Wand2 size={15} aria-hidden /> Start an import</Link>
              <Link href="/admin/import/stores" className="vh-btn vh-btn-ghost"><PlugZap size={15} aria-hidden /> Connected stores</Link>
            </>
          }
        />

        {/* KPI band */}
        <div className="imp-grid cols-4">
          <Metric label="Connected stores" value={dash.connectedStores} foot={`${dash.healthyStores} healthy · ${dash.degradedStores} need attention`} icon={<PlugZap size={18} />} href="/admin/import/stores" />
          <Metric label="Products imported" value={dash.productsImported.toLocaleString("en-IN")} foot={`${dash.productsUpdated.toLocaleString("en-IN")} updated all-time`} icon={<Boxes size={18} />} />
          <Metric label="Sync success rate" value={`${dash.syncSuccessRatePct}%`} foot={`avg ${dash.avgSyncSeconds}s per run`} icon={<CheckCircle2 size={18} />} />
          <Metric label="Open failures" value={dash.openFailures} foot={`${dash.retryableFailures} retryable`} icon={<AlertTriangle size={18} />} href="/admin/import/failed" />
        </div>

        <div className="imp-grid cols-2">
          {/* Today + top sellers */}
          <Card title={<span className="vh-row" style={{ gap: 8 }}><RefreshCw size={16} aria-hidden /> Today</span>} action={<Link className="small" href="/admin/import/history">History →</Link>}>
            <div className="imp-grid cols-2" style={{ gap: 10 }}>
              <Metric label="Imports today" value={dash.todaysImports} />
              <Metric label="Syncs today" value={dash.todaysSyncs} />
            </div>
            <div style={{ marginTop: "var(--sp-3)" }}>
              <div className="small muted" style={{ fontWeight: 700, marginBottom: 6 }}>Top sellers by imports</div>
              {dash.topSellers.length === 0 ? <p className="small muted" style={{ margin: 0 }}>No imports yet.</p> : (
                <div style={{ display: "grid", gap: 6 }}>
                  {dash.topSellers.map((s) => (
                    <div key={s.name} className="vh-row-between small"><span>{s.name}</span><span className="tabular" style={{ fontWeight: 700 }}>{s.imported}</span></div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Recent activity */}
          <Card title={<span className="vh-row" style={{ gap: 8 }}><History size={16} aria-hidden /> Recent activity</span>} action={<Link className="small" href="/admin/import/logs">Logs →</Link>}>
            {dash.recentActivity.length === 0 ? (
              <EmptyState icon="📥" headline="No imports yet" sub="Start your first import to see activity here." />
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {dash.recentActivity.map((a, i) => (
                  <div key={i} className="vh-row-between" style={{ gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="small" style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.label}</div>
                      <div className="small muted">{ago(a.at)} · {a.imported} imported{a.failed ? ` · ${a.failed} failed` : ""}</div>
                    </div>
                    <StatusPill tone={a.status === "completed" ? "ok" : a.status === "completed_with_errors" ? "warn" : "danger"}>{a.status.replace(/_/g, " ")}</StatusPill>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Connected stores roster */}
        <Card title={<span className="vh-row" style={{ gap: 8 }}><PlugZap size={16} aria-hidden /> Connected stores</span>} action={<Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/import/wizard"><DownloadCloud size={13} aria-hidden /> Connect a store</Link>}>
          {stores.length === 0 ? (
            <EmptyState icon="🔌" headline="No stores connected" sub="Connect a seller's store to start importing." cta={{ label: "Start an import", href: "/admin/import/wizard" }} />
          ) : (
            <div className="imp-grid cols-3">
              {stores.map((s) => {
                const m = methodMeta(s.method);
                return (
                  <div key={s.id} className="imp-glass" style={{ padding: 14, display: "grid", gap: 8 }}>
                    <div className="vh-row-between">
                      <span className="vh-row" style={{ gap: 8, fontWeight: 700 }}><MethodGlyph method={s.method} /> {s.sellerName}</span>
                      <HealthPill health={s.health} />
                    </div>
                    <div className="small muted">{m.name} · {s.productCount ?? 0} products · synced {ago(s.lastSyncAt)}</div>
                    <div className="vh-row" style={{ gap: 8 }}>
                      <span className="imp-chip">{s.schedule ?? "manual"} sync</span>
                      {s.autoPublish && <span className="imp-chip">auto-publish (non-regulated)</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Compliance note — the whole reason imports are gated */}
        <div className="vh-banner vh-banner-info" role="note">
          <ShieldNote />
        </div>
      </ImpShell>
    </Shell>
  );
}

function ShieldNote() {
  return (
    <div>
      <strong style={{ display: "block", marginBottom: 2 }}>Imports never bypass compliance</strong>
      Every imported product lands as a <b>draft</b>. A regulated (CBD) product can only sell once its batch has an approved lab report — importing it does not make it sellable (A2). Medical Cannabis is never imported through any store connection; the importer records and blocks it (A1).
    </div>
  );
}
