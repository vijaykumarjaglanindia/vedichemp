/**
 * VEDIC HEMP — DURABLE RUNTIME STATE (pilot persistence bridge)
 *
 * The application keeps its live data in in-process stores hung off globalThis
 * (`__vh*`). That is fast and simple, but the data evaporates when the process
 * restarts — which, on a hosted single instance (e.g. Replit Reserved VM), is
 * every redeploy. This module makes that data DURABLE without rewriting all 49
 * stores into relational models at once:
 *
 *   • on boot  — hydrate every store from its saved JSON snapshot (AppSnapshot)
 *   • at runtime — flush the snapshots on a short interval, and once more on
 *                  shutdown (SIGTERM/SIGINT), so at most a few seconds of the
 *                  most recent writes can be lost.
 *
 * This is honest about its limits:
 *   • It assumes a SINGLE writer. Two instances would clobber each other's
 *     snapshots, so a hosted deployment must be single-instance (Reserved VM),
 *     not autoscaled. That is documented in PRODUCTION.md.
 *   • It carries no money/eligibility authority. The compliance tables and
 *     their A1–A6 constraints remain the source of truth; a snapshot cannot
 *     bypass a database CHECK, a WORM trigger or a maker–checker rule.
 *   • Each store is meant to graduate to its own relational model over time;
 *     when it does, its key is simply removed from STORE_KEYS below.
 *
 * It is a no-op unless a real database is configured, and it never runs inside
 * the test runner (tests reset the `__vh*` globals themselves).
 */

import { db } from "@/lib/db";

/** Every in-process store, by its globalThis key. Keep in sync with the app. */
export const STORE_KEYS = [
  "__vhAccounts", "__vhAdminRoles", "__vhAds", "__vhAdverseEvents", "__vhAuditLog",
  "__vhB2B", "__vhBulkReports", "__vhCampaigns", "__vhCatalogStore", "__vhCategories",
  "__vhClassDisplay", "__vhCmsOverrides", "__vhCmsRevisions", "__vhCommerce", "__vhCommissions",
  "__vhConsent", "__vhCoupons", "__vhDispensing", "__vhEarnings", "__vhFeatures",
  "__vhGateway", "__vhGiftCards", "__vhImportDB", "__vhListingReports", "__vhMedia",
  "__vhNotifications", "__vhOpenRecall", "__vhOrders", "__vhPages", "__vhPayments",
  "__vhPlatformFlags", "__vhPrescriptions", "__vhQuestions", "__vhRecalls", "__vhReviews",
  "__vhSettlements", "__vhShipping", "__vhSiteContent", "__vhStaff", "__vhStoreAnnouncement",
  "__vhStoreAvailability", "__vhStoreCopy", "__vhStoreReports", "__vhStoreReviews",
  "__vhSubscriptions", "__vhSupport", "__vhTheme", "__vhUsers", "__vhVendorKyc", "__vhWallet",
] as const;

type Bag = Record<string, unknown>;
function bag(): Bag {
  return globalThis as unknown as Bag;
}

/** Persistence needs a real database; without one every call below is a no-op. */
export function persistenceEnabled(): boolean {
  return !!process.env.DATABASE_URL;
}

/**
 * Load every saved snapshot into its globalThis key BEFORE any store lazily
 * seeds itself. A store with no snapshot is left untouched, so it self-seeds
 * exactly as before and the first flush captures that seed. Call this exactly
 * once, at boot, before serving traffic (the caller owns the "once").
 */
export async function hydrateAll(): Promise<void> {
  if (!persistenceEnabled()) return;
  const rows = await db.appSnapshot.findMany({ where: { key: { in: STORE_KEYS as unknown as string[] } } });
  const g = bag();
  for (const row of rows) {
    // Prisma returns Json already parsed; guard against nulls.
    if (row.value != null) g[row.key] = row.value;
  }
}

/** Serialize every present store to its snapshot row (idempotent upsert). */
export async function flushAll(): Promise<void> {
  if (!persistenceEnabled()) return;
  const g = bag();
  for (const key of STORE_KEYS) {
    const current = g[key];
    if (current === undefined) continue; // never touched this process → nothing to save
    // Round-trip through JSON so only serializable state is stored; a store that
    // holds a Map/Set/function at the top level would need its own model, not this.
    let value: unknown;
    try {
      value = JSON.parse(JSON.stringify(current));
    } catch {
      continue; // skip un-serializable stores rather than crash the flush
    }
    await db.appSnapshot.upsert({
      where: { key },
      create: { key, value: value as never },
      update: { value: value as never },
    });
  }
}

let timer: ReturnType<typeof setInterval> | undefined;
let flushing = false;

async function safeFlush(): Promise<void> {
  if (flushing) return; // never overlap two flushes
  flushing = true;
  try {
    await flushAll();
  } catch (err) {
    console.error("[persist] flush failed:", err);
  } finally {
    flushing = false;
  }
}

/** Start the periodic flush. Safe to call once at boot. */
export function startAutoFlush(everyMs = 5000): void {
  if (timer || !persistenceEnabled()) return;
  timer = setInterval(safeFlush, everyMs);
  // Don't keep the event loop alive purely for the flush timer.
  if (typeof timer === "object" && "unref" in timer) (timer as { unref: () => void }).unref();
}

/** Flush once and stop the timer — used by the shutdown handlers. */
export async function stopAndFlush(): Promise<void> {
  if (timer) { clearInterval(timer); timer = undefined; }
  await safeFlush();
}
