/**
 * VEDIC HEMP — CONNECTED STORES.
 *
 * The roster of every seller store wired into the marketplace, with its method,
 * health, sync cadence and last-sync time. Disconnecting is audited. Credentials
 * are shown masked only — the raw secret never leaves the server.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { PlugZap, DownloadCloud, Trash2, RefreshCw } from "lucide-react";
import { Shell } from "../../Shell";
import { Card, EmptyState, StatusPill } from "@/components/ui";
import { ImpShell, ImpHero, HealthPill, CapabilityChips, MethodGlyph } from "../_ui";
import { listStores } from "@/lib/import/store";
import { methodMeta } from "@/lib/import/connectors";
import { removeStoreAction, syncStoreAction } from "../actions";

export const metadata: Metadata = { title: "Connected Stores" };
export const dynamic = "force-dynamic";

function ago(iso?: string): string {
  if (!iso) return "never synced";
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  return h < 1 ? "synced just now" : h < 24 ? `synced ${h}h ago` : `synced ${Math.floor(h / 24)}d ago`;
}

export default async function ConnectedStoresPage() {
  const stores = await listStores();
  return (
    <Shell active="/admin/import/stores" breadcrumb={["Admin", "Marketplace", "Import"]} title="Connected Stores">
      <ImpShell>
        <ImpHero
          badge="Connections"
          title="Connected seller stores"
          sub="Every store you have wired in, and how it is doing. Add another to import its catalogue, or disconnect one to stop syncing."
          actions={<Link href="/admin/import/wizard" className="vh-btn vh-btn-primary"><DownloadCloud size={15} aria-hidden /> Connect a store</Link>}
        />

        {stores.length === 0 ? (
          <Card><EmptyState icon="🔌" headline="No stores connected yet" sub="Connect a seller's WooCommerce, Shopify, feed or custom store to begin." cta={{ label: "Connect a store", href: "/admin/import/wizard" }} /></Card>
        ) : (
          <div className="imp-grid cols-2">
            {stores.map((s) => {
              const m = methodMeta(s.method);
              return (
                <Card key={s.id} title={<span className="vh-row" style={{ gap: 8 }}><MethodGlyph method={s.method} /> {s.sellerName}</span>} action={<HealthPill health={s.health} />}>
                  <div className="small muted" style={{ marginBottom: 8 }}>{m.name} · <span className="mono">{s.endpoint}</span></div>
                  <div className="vh-row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                    <StatusPill tone="info">{s.productCount ?? 0} products</StatusPill>
                    <StatusPill tone="neutral">{s.schedule ?? "manual"} sync</StatusPill>
                    <span className="imp-health idle"><RefreshCw size={12} aria-hidden style={{ marginRight: 4 }} />{ago(s.lastSyncAt)}</span>
                  </div>
                  <CapabilityChips meta={m} />
                  {Object.keys(s.credentialsMasked).length > 0 && (
                    <div className="small muted" style={{ marginTop: 10 }}>
                      {Object.entries(s.credentialsMasked).map(([k, v]) => <span key={k} style={{ marginRight: 12 }}>{k}: <span className="mono">{v}</span></span>)}
                    </div>
                  )}
                  <div className="vh-row" style={{ gap: 8, marginTop: 12 }}>
                    <form action={syncStoreAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="vh-btn vh-btn-sm vh-btn-ghost"><RefreshCw size={13} aria-hidden /> Sync now</button>
                    </form>
                    <Link href="/admin/import/scheduler" className="vh-btn vh-btn-sm vh-btn-ghost">Schedule</Link>
                    <form action={removeStoreAction} style={{ marginLeft: "auto" }}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit" style={{ color: "var(--vh-danger)" }}><Trash2 size={13} aria-hidden /> Disconnect</button>
                    </form>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="vh-banner vh-banner-info" role="note">
          <div><strong>Credentials are stored masked.</strong> API keys and tokens are never returned to the browser — you see only the last four characters. Rotating a key means reconnecting the store.</div>
        </div>
      </ImpShell>
    </Shell>
  );
}
