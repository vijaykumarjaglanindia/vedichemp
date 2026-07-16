/**
 * GET /seller/reports/export — this store's 14-day report as CSV.
 * Computed server-side from the live orders/ads stores; nothing is client-fed.
 */
import { sellerReport, toCsv } from "@/lib/analytics";

const STORE = "Vedic Botanicals";

export async function GET(): Promise<Response> {
  const r = await sellerReport(STORE, 14);
  const rupees = (p: number) => (p / 100).toFixed(2);
  const parts: string[] = [];
  parts.push(toCsv(["Date", "Sales (₹)", "Orders"], r.series.map((d) => [d.date, rupees(d.paise), d.orders])));
  parts.push("");
  parts.push(toCsv(["Top product", "Units", "Revenue (₹)"], r.topProducts.map((p) => [p.name, p.units, rupees(p.paise)])));
  const body = parts.join("\n");
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="vedic-botanicals-report.csv"`,
    },
  });
}
