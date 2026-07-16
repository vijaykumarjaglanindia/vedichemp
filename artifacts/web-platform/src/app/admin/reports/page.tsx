/**
 * VEDIC HEMP — REPORTED LISTINGS (admin trust & safety)
 *
 * Buyer reports of listings — counterfeit, wrong category, prohibited claims,
 * safety. Dismiss closes a report with a reason; Uphold takes the listing down
 * through the catalogue server guard and resolves every open report on it.
 * Both are audited.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Flag, ShieldAlert } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, StatusPill, EmptyState } from "@/components/ui";
import { allReports, reasonLabel, type ReportStatus } from "@/lib/reports";
import { decideListingReport } from "../actions";

export const metadata: Metadata = { title: "Reported listings · Admin" };
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { sev: "ok" | "danger" | "warn"; text: string }> = {
  uphold: { sev: "ok", text: "Report upheld — the listing was taken down and the seller notified." },
  dismiss: { sev: "ok", text: "Report dismissed — the listing stays live and the reason is recorded." },
  note: { sev: "danger", text: "Dismissing a report needs a short reason (at least 10 characters)." },
  state: { sev: "warn", text: "That report was already resolved." },
  missing: { sev: "warn", text: "That report no longer exists." },
};

const TONE: Record<ReportStatus, "warn" | "danger" | "ok"> = { OPEN: "warn", ACTIONED: "danger", DISMISSED: "ok" };

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ done?: string; err?: string }> }) {
  const { done, err } = await searchParams;
  const reports = await allReports();
  const open = reports.filter((r) => r.status === "OPEN").length;
  const msg = (done && MESSAGES[done]) || (err && MESSAGES[err]) || undefined;

  return (
    <Shell active="/admin/reports" breadcrumb={["Admin", "Trust", "Reported listings"]} title="Reported listings"
      actions={<StatusPill tone={open ? "warn" : "ok"}>{open} open</StatusPill>}
    >
      {msg && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity={msg.sev}>{msg.text}</Banner></div>}

      <Card title={<span className="vh-row" style={{ gap: 8 }}><Flag size={16} strokeWidth={2.2} aria-hidden /> Buyer reports</span>} pad0>
        {reports.length === 0 ? (
          <div style={{ padding: 12 }}><EmptyState icon="🚩" headline="No reports" sub="Buyer reports of listings appear here for review." /></div>
        ) : (
          <div>
            {reports.map((r) => (
              <div key={r.id} style={{ borderTop: "1px solid var(--vh-line)", padding: "14px 16px" }}>
                <div className="vh-row-between" style={{ gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                  <span className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                    <StatusPill tone={TONE[r.status]}>{r.status}</StatusPill>
                    <span className="vh-pill vh-pill-warn"><ShieldAlert size={12} aria-hidden /> {reasonLabel(r.reason)}</span>
                    <Link className="small" href={`/products/${r.productSlug}`} style={{ fontWeight: 700 }}>{r.productTitle}</Link>
                    <span className="small muted">by {r.seller}</span>
                  </span>
                  <span className="small muted tabular">{r.createdAt} · {r.reporter}</span>
                </div>
                <p className="small" style={{ margin: "4px 0 10px" }}>{r.detail}</p>
                {r.status === "OPEN" ? (
                  <div className="vh-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <form action={decideListingReport} className="vh-row" style={{ gap: 6, alignItems: "flex-end", flexWrap: "wrap" }}>
                      <input type="hidden" name="reportId" value={r.id} />
                      <input type="hidden" name="decision" value="uphold" />
                      <input className="vh-input vh-input-sm" name="note" placeholder="Note to the seller (optional)" style={{ width: 240 }} aria-label={`Uphold note for ${r.productTitle}`} />
                      <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Uphold &amp; take down</button>
                    </form>
                    <form action={decideListingReport} className="vh-row" style={{ gap: 6, alignItems: "flex-end", flexWrap: "wrap" }}>
                      <input type="hidden" name="reportId" value={r.id} />
                      <input type="hidden" name="decision" value="dismiss" />
                      <input className="vh-input vh-input-sm" name="note" placeholder="Reason (≥10 chars)" style={{ width: 200 }} aria-label={`Dismiss reason for ${r.productTitle}`} />
                      <button className="vh-btn vh-btn-sm" type="submit">Dismiss</button>
                    </form>
                  </div>
                ) : (
                  r.adminNote && <div className="small muted">Decision: {r.adminNote}{r.decidedAt ? ` · ${r.decidedAt}` : ""}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </Shell>
  );
}
