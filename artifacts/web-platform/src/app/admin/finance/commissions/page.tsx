/**
 * VEDIC HEMP — COMMISSION SCHEDULES (A5)
 *
 * A commission change is announced first and applied later: the schedule
 * cannot take effect earlier than 30 days after the notice goes to sellers,
 * and it can never touch a statement that has already been posted. Both rules
 * are database constraints (CHECK a5_thirty_day_notice; the posted-settlement
 * immutability trigger) — this page is just the honest UI over them.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Percent } from "lucide-react";
import { Shell } from "../../Shell";
import { Banner, Card, StatusPill } from "@/components/ui";
import { CLASS_META } from "@/lib/compliance";
import { minEffectiveFrom, readCommissions } from "@/lib/adminstate";
import { saveCommissionSchedule } from "../../actions";

export const metadata: Metadata = { title: "Commission schedules · Admin" };
export const dynamic = "force-dynamic";

const NOTES: Record<string, { sev: "ok" | "danger"; text: string }> = {
  saved: { sev: "ok", text: "Schedule saved. Sellers are notified today; the new rate applies only from the effective date." },
  date: { sev: "danger", text: "A5: the effective date must be at least 30 days after the notice date (today). Retroactive or short-notice fee changes are impossible — the database refuses them too." },
  rate: { sev: "danger", text: "Rate must be between 0 and 40 percent." },
  cls: { sev: "danger", text: "Pick a compliance class." },
};

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ cs?: string }>;
}) {
  const { cs } = await searchParams;
  const rows = await readCommissions();
  const minDate = minEffectiveFrom(new Date()).toISOString().slice(0, 10);

  return (
    <Shell
      active="/admin/finance"
      breadcrumb={["Admin", "Finance", "Commission schedules"]}
      title="Commission schedules"
      actions={<Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/finance"><ArrowLeft size={14} aria-hidden /> Finance</Link>}
    >
      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><Percent size={16} strokeWidth={2.2} aria-hidden /> Announce a rate change</span>}>
          {cs && NOTES[cs] && (
            <div style={{ marginBottom: 12 }}>
              <Banner severity={NOTES[cs].sev}>{NOTES[cs].text}</Banner>
            </div>
          )}
          <form action={saveCommissionSchedule} className="vh-grid" style={{ gap: 14 }}>
            <div className="vh-field">
              <label className="vh-label" htmlFor="cs-cls">Compliance class <span className="req">*</span></label>
              <select className="vh-select" id="cs-cls" name="cls" required defaultValue="CBD_WELLNESS">
                {Object.entries(CLASS_META).map(([cls, meta]) => (
                  <option key={cls} value={cls}>{meta.label}</option>
                ))}
              </select>
            </div>
            <div className="vh-field">
              <label className="vh-label" htmlFor="cs-rate">Commission rate (%) <span className="req">*</span></label>
              <input className="vh-input" id="cs-rate" name="ratePct" type="number" min={1} max={40} step="0.5" required placeholder="e.g. 12" />
            </div>
            <div className="vh-field">
              <label className="vh-label" htmlFor="cs-from">Effective from <span className="req">*</span></label>
              <input className="vh-input" id="cs-from" name="effectiveFrom" type="date" required />
              <span className="vh-help">Earliest permitted: {minDate} — notice goes to sellers today; 30 days must pass (A5).</span>
            </div>
            <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit" style={{ justifySelf: "start" }}>
              Send notice & schedule
            </button>
          </form>
        </Card>

        <Card title="Scheduled changes" pad0>
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead><tr><th>Class</th><th>Rate</th><th>Notice sent</th><th>Effective from</th><th>By</th></tr></thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={5} className="small muted" style={{ padding: 16 }}>No scheduled changes. Current agreement rates continue to apply — commercial terms are never shown on public pages.</td></tr>
                ) : rows.map((r, i) => (
                  <tr key={i}>
                    <td><StatusPill tone="neutral">{CLASS_META[r.cls as keyof typeof CLASS_META]?.short ?? r.cls}</StatusPill></td>
                    <td className="tabular">{r.ratePct}%</td>
                    <td className="small tabular">{r.noticeSentAt}</td>
                    <td className="small tabular">{r.effectiveFrom}</td>
                    <td className="small muted">{r.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
