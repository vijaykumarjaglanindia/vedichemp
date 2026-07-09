/**
 * VEDIC HEMP — REPORTS (§2.4/2.5/2.6/2.8 rollup)
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card } from "@/components/ui";
import { REPORT_TILES } from "../_lib/data";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <Shell active="/seller/reports" breadcrumb={["Seller Central", "Reports"]} title="Reports">
      <div className="vh-grid cols-3">
        {REPORT_TILES.map((r) => (
          <Card key={r.key} title={<span>{r.icon} {r.label}</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>{r.blurb}</p>
            <div className="vh-row" style={{ gap: 8 }}>
              <a className="vh-btn vh-btn-sm vh-btn-primary" href={`#${r.key}`}>Export CSV</a>
              <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`#${r.key}`}>View</a>
            </div>
          </Card>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 16 }}>
        Compliance reports never surface health data (Rx contents) — only aggregate counts of licence/CoA state.
        Any drill-down into a specific sensitive record goes through the reason-code viewer, not this dashboard.
      </p>
    </Shell>
  );
}
