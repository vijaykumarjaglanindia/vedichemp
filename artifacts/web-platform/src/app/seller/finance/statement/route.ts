/**
 * VEDIC HEMP — SELLER STATEMENT CSV
 *
 * The seller's settlement statement, generated from the live settlement store
 * (integer paise, formatted to rupees at the edge). Posted rows are immutable;
 * this export simply reads them.
 */

import { statementCsv } from "@/lib/settlements";

export async function GET(): Promise<Response> {
  const csv = await statementCsv("Vedic Botanicals");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="vedic-botanicals-settlements.csv"',
    },
  });
}
