/**
 * VEDIC HEMP — SELLER · CONNECT YOUR STORE.
 *
 * A seller wires their own external store into the marketplace and imports its
 * catalogue, self-service. The connect flow and every existing connection shown
 * here belong to the signed-in seller only; imports land as DRAFT behind the
 * same A1/A2 gates as any other listing.
 */

import type { Metadata } from "next";
import { PlugZap, RefreshCw, Trash2, Store } from "lucide-react";
import { Shell } from "../Shell";
import { Card, EmptyState, StatusPill } from "@/components/ui";
import { METHODS, methodMeta } from "@/lib/import/connectors";
import { Connect } from "./Connect";
import { myConnections, sellerSyncAction, sellerDisconnectAction } from "./actions";

export const metadata: Metadata = { title: "Connect your store" };
export const dynamic = "force-dynamic";

function ago(iso?: string): string {
  if (!iso) return "not synced yet";
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  return h < 1 ? "synced just now" : h < 24 ? `synced ${h}h ago` : `synced ${Math.floor(h / 24)}d ago`;
}

export default async function SellerConnectPage() {
  const connections = await myConnections();

  return (
    <Shell active="/seller/connect" breadcrumb={["Seller", "Catalogue"]} title="Connect your store">
      <div style={{ display: "grid", gap: "var(--sp-4)" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><PlugZap size={17} aria-hidden /> Bring your catalogue in</span>}>
          <p className="muted" style={{ marginTop: 0 }}>
            Already selling on WooCommerce, Shopify, or via a product feed? Connect it and we&apos;ll pull your catalogue in
            for you — as drafts you review before they go live. You only need to do this once per store; after that you can
            re-sync any time to pick up price and stock changes.
          </p>
          <Connect methods={METHODS} />
        </Card>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><Store size={17} aria-hidden /> Your connected stores</span>}>
          {connections.length === 0 ? (
            <EmptyState icon="🔌" headline="No stores connected yet" sub="Connect your first store above to import its products." />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {connections.map((s) => {
                const m = methodMeta(s.method);
                return (
                  <div key={s.id} className="vh-card" style={{ padding: 14 }}>
                    <div className="vh-row" style={{ gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
                      <div className="vh-row" style={{ gap: 8 }}>
                        <span style={{ fontSize: "1.4rem" }} aria-hidden>{m.emoji}</span>
                        <div>
                          <div style={{ fontWeight: 650 }}>{s.label}</div>
                          <div className="small muted">{m.name} · {s.productCount ?? 0} products · {ago(s.lastSyncAt)}</div>
                        </div>
                      </div>
                      <div className="vh-row" style={{ gap: 8 }}>
                        <StatusPill tone={s.health === "healthy" ? "ok" : s.health === "degraded" ? "warn" : "danger"}>{s.health}</StatusPill>
                        <form action={sellerSyncAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <button type="submit" className="vh-btn vh-btn-sm vh-btn-ghost"><RefreshCw size={13} aria-hidden /> Sync now</button>
                        </form>
                        <form action={sellerDisconnectAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <button type="submit" className="vh-btn vh-btn-sm vh-btn-ghost" style={{ color: "var(--vh-danger)" }}><Trash2 size={13} aria-hidden /> Disconnect</button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="vh-banner vh-banner-info" role="note">
          <div>
            <strong>Everything comes in as a draft.</strong> Imported products are never published automatically. A CBD
            product also needs an approved lab report before it can sell, and Medical Cannabis is never imported. Your
            store credentials are stored masked — we only ever show the last few characters.
          </div>
        </div>
      </div>
    </Shell>
  );
}
