/**
 * VEDIC HEMP — BRAND MAPPING.
 *
 * Reconciles a seller's detected brand names with the marketplace's canonical
 * brands so the same maker isn't listed twice ("Veda Pure" vs "VedaPure"). Left:
 * add or update a mapping, optionally merging a detected brand into an existing
 * one to dedupe. Right: the current table with a "merged" pill and an
 * AI-mapped / manual chip. Mappings are operator state — new brands are created
 * automatically on import, and nothing here publishes anything: imports still
 * arrive as DRAFT and a regulated (CBD) product cannot sell until its lab report
 * is approved (A2). Mappings are records; corrections are new saves, not edits.
 */

import type { Metadata } from "next";
import { Sparkles, Hand, ArrowRight, Tag, GitMerge } from "lucide-react";
import { Shell } from "@/app/admin/Shell";
import { ImpShell, ImpHero } from "@/app/admin/import/_ui";
import { Card, EmptyState } from "@/components/ui";
import { listBrandMap } from "@/lib/import/store";
import { saveBrandMapAction } from "@/app/admin/import/actions";

export const metadata: Metadata = { title: "Brand Mapping" };
export const dynamic = "force-dynamic";

export default async function BrandMappingPage() {
  const mappings = await listBrandMap();

  return (
    <Shell active="/admin/import/mapping/brand" breadcrumb={["Admin", "Marketplace", "Import"]} title="Brand Mapping">
      <ImpShell>
        <ImpHero
          badge="Mapping"
          title="Brand mapping"
          sub="Point each seller's detected brand at a marketplace brand so one maker isn't split across near-duplicate names, and merge stray variants into a single canonical brand."
        />

        <div className="imp-grid cols-2">
          {/* LEFT — add / update mapping */}
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Tag size={16} aria-hidden /> Add / update mapping</span>}>
            <form action={saveBrandMapAction} style={{ display: "grid", gap: "var(--sp-4)" }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor="sourceName" className="small muted">Detected brand</label>
                <input id="sourceName" name="sourceName" className="vh-input" placeholder="Veda Pure" required />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor="targetBrand" className="small muted">Marketplace brand</label>
                <input id="targetBrand" name="targetBrand" className="vh-input" placeholder="VedaPure" required />
              </div>

              <label htmlFor="merged" className="vh-row" style={{ gap: 8, alignItems: "flex-start" }}>
                <input id="merged" name="merged" type="checkbox" style={{ marginTop: 3 }} />
                <span className="small">Merge into an existing brand (dedupe)</span>
              </label>

              <div className="vh-row" style={{ justifyContent: "flex-end" }}>
                <button type="submit" className="vh-btn vh-btn-primary vh-btn-sm">Save mapping</button>
              </div>
            </form>

            <p className="small muted" style={{ marginTop: "var(--sp-4)" }}>
              New brands are created automatically on import; use this to fold duplicates —
              e.g. <span className="mono">Veda Pure → VedaPure</span> — into one canonical brand.
            </p>
          </Card>

          {/* RIGHT — current mappings */}
          <Card title="Current mappings" action={<span className="small muted tabular">{mappings.length} mapped</span>}>
            {mappings.length === 0 ? (
              <EmptyState
                icon="🏷️"
                headline="No brand mappings yet"
                sub="Add one on the left, or let the importer suggest matches during a run."
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="vh-table">
                  <thead>
                    <tr>
                      <th>Detected brand</th>
                      <th aria-label="maps to" />
                      <th>Marketplace brand</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m) => (
                      <tr key={m.id} className="vh-row">
                        <td className="mono">{m.sourceName}</td>
                        <td aria-hidden style={{ color: "var(--vh-muted)" }}><ArrowRight size={14} /></td>
                        <td>
                          <span className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                            <span className="mono">{m.targetBrand}</span>
                            {m.merged && <span className="imp-chip on"><GitMerge size={12} aria-hidden /> merged</span>}
                          </span>
                        </td>
                        <td>
                          {m.auto ? (
                            <span className="imp-chip on"><Sparkles size={12} aria-hidden /> AI-mapped</span>
                          ) : (
                            <span className="imp-chip"><Hand size={12} aria-hidden /> Manual</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </ImpShell>
    </Shell>
  );
}
