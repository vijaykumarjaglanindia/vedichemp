/**
 * GET /admin/analytics/export — the 14-day platform report as CSV.
 * Computed server-side from the live orders/ads stores.
 */
import { adminReport, toCsv } from "@/lib/analytics";

export async function GET(): Promise<Response> {
  const r = await adminReport(14);
  const rupees = (p: number) => (p / 100).toFixed(2);
  const parts: string[] = [];
  parts.push(toCsv(["Date", "GMV (₹)", "Orders"], r.series.map((d) => [d.date, rupees(d.paise), d.orders])));
  parts.push("");
  parts.push(toCsv(["Top seller", "Units", "Revenue (₹)"], r.topSellers.map((s) => [s.name, s.units, rupees(s.paise)])));
  parts.push("");
  parts.push(toCsv(["Top product", "Units", "Revenue (₹)"], r.topProducts.map((p) => [p.name, p.units, rupees(p.paise)])));
  return new Response(parts.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="vedic-hemp-platform-report.csv"`,
    },
  });
}
