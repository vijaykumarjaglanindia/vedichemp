/**
 * VEDIC HEMP — ATTRIBUTE MAPPING.
 *
 * Aligns a seller's attribute names to the marketplace's canonical attributes so
 * variants land on the right axes (e.g. "Bottle Size" → "Volume", "Strength" →
 * "CBD Strength"). Left: add or update a mapping. Right: the current table with an
 * AI-mapped / manual chip. Mappings are operator state — nothing here publishes a
 * product; imports still arrive as DRAFT and a regulated (CBD) product cannot sell
 * until its lab report is approved (A2).
 */

import type { Metadata } from "next";
import { Sparkles, Hand, ArrowRight, Tags } from "lucide-react";
import { Shell } from "@/app/admin/Shell";
import { ImpShell, ImpHero } from "@/app/admin/import/_ui";
import { Card, EmptyState } from "@/components/ui";
import { listAttributeMap } from "@/lib/import/store";
import { saveAttributeMapAction } from "@/app/admin/import/actions";

export const metadata: Metadata = { title: "Attribute Mapping" };
export const dynamic = "force-dynamic";

export default async function AttributeMappingPage() {
  const mappings = await listAttributeMap();

  return (
    <Shell active="/admin/import/mapping/attribute" breadcrumb={["Admin", "Marketplace", "Import"]} title="Attribute Mapping">
      <ImpShell>
        <ImpHero
          badge="Mapping"
          title="Attribute mapping"
          sub="Point each seller's attribute name at a marketplace attribute so product variants line up on the same axes across every store."
        />

        <div className="imp-grid cols-2">
          {/* LEFT — add / update mapping */}
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Tags size={16} aria-hidden /> Add / update mapping</span>}>
            <form action={saveAttributeMapAction} style={{ display: "grid", gap: "var(--sp-4)" }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor="sourceName" className="small muted">Seller attribute</label>
                <input id="sourceName" name="sourceName" className="vh-input" placeholder="Bottle Size" required />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor="targetName" className="small muted">Marketplace attribute</label>
                <input id="targetName" name="targetName" className="vh-input" placeholder="Volume" required />
              </div>

              <div className="vh-row" style={{ justifyContent: "flex-end" }}>
                <button type="submit" className="vh-btn vh-btn-primary vh-btn-sm">Save mapping</button>
              </div>
            </form>

            <p className="small muted" style={{ marginTop: "var(--sp-4)" }}>
              Attribute mapping keeps variants aligned — e.g. <span className="mono">Bottle Size → Volume</span> and{" "}
              <span className="mono">Strength → CBD Strength</span> — so the same option means the same thing everywhere.
            </p>
          </Card>

          {/* RIGHT — current mappings */}
          <Card title="Current mappings" action={<span className="small muted tabular">{mappings.length} mapped</span>}>
            {mappings.length === 0 ? (
              <EmptyState
                icon="🧬"
                headline="No attribute mappings yet"
                sub="Add one on the left, or let the importer suggest matches during a run."
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="vh-table">
                  <thead>
                    <tr>
                      <th>Seller attribute</th>
                      <th aria-label="maps to" />
                      <th>Marketplace attribute</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m) => (
                      <tr key={m.id} className="vh-row">
                        <td className="mono">{m.sourceName}</td>
                        <td aria-hidden style={{ color: "var(--vh-muted)" }}><ArrowRight size={14} /></td>
                        <td className="mono">{m.targetName}</td>
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
