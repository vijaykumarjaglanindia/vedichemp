"use server";

/**
 * VEDIC HEMP — SELLER SELF-SERVICE STORE CONNECT.
 *
 * Lets a seller wire their OWN external store (WooCommerce, Shopify, a feed, …)
 * into the marketplace and pull its catalogue — without an admin doing it for
 * them. Every action resolves the acting seller from the session (never from a
 * form field), so a seller can only ever touch their own connections, and every
 * import runs through the same gates as any other path onto the catalogue:
 *
 *   • A1 — Medical Cannabis is refused at import.
 *   • A2 — every product lands DRAFT; a regulated (CBD) product cannot sell
 *          until its lab report is approved. A seller cannot self-publish here.
 *   • claims / price — disease-treatment copy and non-positive prices are rejected.
 *
 * The connection is stored with masked credentials only.
 */

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-lite";
import { writeAudit } from "@/lib/audit";
import { actingStore } from "../_lib/store";
import { connectorFor, methodMeta } from "@/lib/import/connectors";
import { previewImport, runImport, syncStore } from "@/lib/import/service";
import * as db from "@/lib/import/store";
import { defaultRules } from "@/lib/import/types";
import type { ConnectionMethod, NormalizedProduct, ImportRules, ImportOptions, ImportSummary } from "@/lib/import/types";
import type { ImportPreview } from "@/lib/import/service";

const OPTIONS: ImportOptions = { mode: "everything", duplicateStrategy: "update", deleteRemoved: false };

async function seller(): Promise<{ email: string; name: string }> {
  const session = await getSession();
  const email = session?.email ?? "seller@example.in";
  const name = await actingStore();
  return { email, name };
}

/** Rules from the seller's optional markup — everything else is the safe default. */
function rulesFrom(markupPct: number): ImportRules {
  const pct = Number.isFinite(markupPct) ? Math.max(-90, Math.min(500, markupPct)) : 0;
  return { ...defaultRules(), priceAdjustPct: pct, roundTo: 100 };
}

function mask(v: string): string {
  const t = v.trim();
  return t.length <= 4 ? "••••" : `${"•".repeat(Math.max(4, t.length - 4))}${t.slice(-4)}`;
}

/* ─────────────────────────── Connect flow ─────────────────────────── */

export async function sellerValidate(method: ConnectionMethod, config: Record<string, string>) {
  return connectorFor(method).validate(config);
}

/** Fetch the source catalogue and show what WOULD import, under the seller's markup. */
export async function sellerPreview(
  method: ConnectionMethod,
  config: Record<string, string>,
  markupPct: number,
): Promise<{ products: NormalizedProduct[]; preview: ImportPreview }> {
  const products = await connectorFor(method).fetchProducts(config);
  const preview = await previewImport(products, rulesFrom(markupPct), OPTIONS);
  return { products, preview };
}

/** Persist the connection (masked) under THIS seller and import its catalogue. */
export async function sellerImport(input: {
  method: ConnectionMethod;
  label: string;
  endpoint?: string;
  config: Record<string, string>;
  products: NormalizedProduct[];
  markupPct: number;
}): Promise<ImportSummary> {
  const who = await seller();
  const meta = methodMeta(input.method);
  const credentialsMasked: Record<string, string> = {};
  for (const f of meta.fields) if (input.config[f.key] && f.secret) credentialsMasked[f.key] = mask(input.config[f.key]!);

  const store = await db.addStore({
    sellerEmail: who.email, sellerName: who.name, method: input.method,
    label: input.label || `${who.name} — ${meta.name}`, endpoint: input.endpoint, credentialsMasked,
    health: "healthy", productCount: input.products.length, schedule: "manual", autoPublish: false,
  });
  await writeAudit({ actor: who.email, action: "SELLER_STORE_CONNECT", target: store.label, outcome: "OK", note: `Seller connected their own store via ${meta.name}.` });

  const summary = await runImport({ store, products: input.products, rules: rulesFrom(input.markupPct), options: OPTIONS, actor: who.email, trigger: "manual" });
  revalidatePath("/seller/connect");
  revalidatePath("/seller/products");
  return summary;
}

/* ─────────── Ownership-gated mutations on an existing connection ─────────── */

/** True only when this connection belongs to the signed-in seller. */
async function ownedBySeller(id: string): Promise<{ email: string } | null> {
  const who = await seller();
  const store = await db.findStore(id);
  if (!store || store.sellerEmail !== who.email) return null; // not yours → refuse
  return who;
}

export async function sellerSyncAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const who = await ownedBySeller(id);
  if (who) {
    await syncStore({ storeId: id, actor: who.email, trigger: "manual" });
  } else {
    await writeAudit({ actor: (await seller()).email, action: "SELLER_STORE_SYNC", target: id, outcome: "DENIED", note: "Not the seller's own connection." });
  }
  revalidatePath("/seller/connect");
  revalidatePath("/seller/products");
}

export async function sellerDisconnectAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const who = await ownedBySeller(id);
  if (who) {
    const store = await db.findStore(id);
    await db.removeStore(id);
    await writeAudit({ actor: who.email, action: "SELLER_STORE_DISCONNECT", target: store?.label ?? id, outcome: "OK" });
  } else {
    await writeAudit({ actor: (await seller()).email, action: "SELLER_STORE_DISCONNECT", target: id, outcome: "DENIED", note: "Not the seller's own connection." });
  }
  revalidatePath("/seller/connect");
}

/** The connections owned by the signed-in seller (for the page). */
export async function myConnections() {
  const who = await seller();
  return (await db.listStores()).filter((s) => s.sellerEmail === who.email);
}
