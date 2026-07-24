/**
 * VEDIC HEMP — IMPORT DASHBOARD METRICS
 *
 * Everything here is DERIVED from the import store — no hand-typed figures.
 * On a fresh boot the numbers reflect the seeded fixture; as real imports run
 * they move. Zero states are honest (a store with no history reads zero).
 */

import * as db from "./store";
import type { ConnectionMethod } from "./types";

export interface AdminImportDashboard {
  connectedStores: number;
  healthyStores: number;
  degradedStores: number;
  productsImported: number;
  productsUpdated: number;
  productsFailed: number;
  todaysImports: number;
  todaysSyncs: number;
  syncSuccessRatePct: number;
  avgSyncSeconds: number;
  openFailures: number;
  retryableFailures: number;
  topSellers: { name: string; imported: number }[];
  topMethods: { method: ConnectionMethod; runs: number }[];
  recentActivity: { at: string; label: string; status: string; imported: number; failed: number }[];
}

function isToday(iso: string): boolean {
  return iso.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

export async function adminDashboard(): Promise<AdminImportDashboard> {
  const [stores, history, failures] = await Promise.all([db.listStores(), db.listHistory(500), db.listFailures()]);

  const productsImported = history.reduce((n, h) => n + h.imported, 0);
  const productsUpdated = history.reduce((n, h) => n + h.updated, 0);
  const productsFailed = history.reduce((n, h) => n + h.failed, 0);
  const completed = history.filter((h) => h.status === "completed" || h.status === "completed_with_errors").length;
  const durations = history.filter((h) => h.durationMs).map((h) => h.durationMs!);
  const avgMs = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const bySeller = new Map<string, number>();
  for (const h of history) { const s = stores.find((x) => x.id === h.storeId); if (s) bySeller.set(s.sellerName, (bySeller.get(s.sellerName) ?? 0) + h.imported); }
  const byMethod = new Map<ConnectionMethod, number>();
  for (const h of history) byMethod.set(h.method, (byMethod.get(h.method) ?? 0) + 1);

  return {
    connectedStores: stores.length,
    healthyStores: stores.filter((s) => s.health === "healthy").length,
    degradedStores: stores.filter((s) => s.health === "degraded" || s.health === "auth_expired" || s.health === "unreachable").length,
    productsImported, productsUpdated, productsFailed,
    todaysImports: history.filter((h) => isToday(h.startedAt)).reduce((n, h) => n + h.imported, 0),
    todaysSyncs: history.filter((h) => isToday(h.startedAt)).length,
    syncSuccessRatePct: history.length ? Math.round((completed / history.length) * 100) : 100,
    avgSyncSeconds: Math.round(avgMs / 1000),
    openFailures: failures.length,
    retryableFailures: failures.filter((f) => f.retryable).length,
    topSellers: [...bySeller.entries()].map(([name, imported]) => ({ name, imported })).sort((a, b) => b.imported - a.imported).slice(0, 5),
    topMethods: [...byMethod.entries()].map(([method, runs]) => ({ method, runs })).sort((a, b) => b.runs - a.runs).slice(0, 5),
    recentActivity: history.slice(0, 8).map((h) => ({ at: h.startedAt, label: h.storeLabel, status: h.status, imported: h.imported, failed: h.failed })),
  };
}
