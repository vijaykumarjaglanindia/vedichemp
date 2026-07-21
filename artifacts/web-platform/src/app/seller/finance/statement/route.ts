/**
 * VEDIC HEMP — SELLER STATEMENT CSV
 *
 * The seller's settlement statement, generated from the live settlement store
 * (integer paise, formatted to rupees at the edge). Posted rows are immutable;
 * this export simply reads them.
 */

import { statementCsv } from "@/lib/settlements";
import { actingStore } from "../../_lib/store";

function slug(store: string): string {
  return store.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "store";
}

export async function GET(): Promise<Response> {
  const store = await actingStore();
  const csv = await statementCsv(store);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug(store)}-settlements.csv"`,
    },
  });
}
