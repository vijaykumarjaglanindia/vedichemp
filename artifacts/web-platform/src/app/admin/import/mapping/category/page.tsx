/**
 * VEDIC HEMP — IMPORT · CATEGORY MAPPING.
 *
 * Operators bind each seller's own category path (e.g. "Health > CBD > Oils")
 * to a marketplace category. AI proposes likely matches; an operator confirms
 * them. Confirmed mappings are reused on every future import so a store only
 * has to be taught its taxonomy once. Unmapped source paths fall back to a
 * best-guess placement and land — like all imports — as DRAFT, with regulated
 * (CBD) products still barred from sale until an approved lab report exists (A2).
 */

import type { Metadata } from "next";
import { FolderTree, Save, ArrowRight, Sparkles } from "lucide-react";
import { Shell } from "@/app/admin/Shell";
import { ImpShell, ImpHero } from "@/app/admin/import/_ui";
import { Card, EmptyState, StatusPill } from "@/components/ui";
import { listCategoryMap } from "@/lib/import/store";
import { saveCategoryMapAction } from "@/app/admin/import/actions";

export const metadata: Metadata = { title: "Category Mapping" };
export const dynamic = "force-dynamic";

export default async function CategoryMappingPage() {
  const mappings = await listCategoryMap();

  return (
    <Shell active="/admin/import/mapping/category" breadcrumb={["Admin", "Marketplace", "Import"]} title="Category Mapping">
      <ImpShell>
        <ImpHero
          badge="Mapping"
          title="Category mapping"
          sub="Bind each seller's own category path to a marketplace category. Anything left unmapped is placed by best-guess, so teach a store its taxonomy once and every future import reuses it."
        />

        <div className="imp-grid cols-2">
          {/* LEFT · add / update a mapping */}
          <Card title={<span className="vh-row" style={{ gap: 8 }}><FolderTree size={16} aria-hidden /> Add / update mapping</span>}>
            <form action={saveCategoryMapAction} style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor="sourcePath" className="small muted">Seller category path</label>
                <input
                  id="sourcePath"
                  name="sourcePath"
                  type="text"
                  required
                  className="vh-input"
                  placeholder="Health > CBD > Oils"
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor="targetLabel" className="small muted">Marketplace category</label>
                <input
                  id="targetLabel"
                  name="targetLabel"
                  type="text"
                  required
                  className="vh-input"
                  placeholder="CBD Wellness › Oils"
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor="targetCategoryId" className="small muted">Category ID</label>
                <input
                  id="targetCategoryId"
                  name="targetCategoryId"
                  type="text"
                  className="vh-input mono"
                  placeholder="cbd-oils"
                />
              </div>

              <div className="vh-row" style={{ gap: 10 }}>
                <button type="submit" className="vh-btn vh-btn-primary">
                  <Save size={15} aria-hidden /> Save mapping
                </button>
              </div>

              <p className="small muted" style={{ margin: 0 }}>
                Saved mappings are reused on every future import from this taxonomy. AI suggests likely
                matches; confirming one here turns a best-guess into an operator-confirmed rule.
              </p>
            </form>
          </Card>

          {/* RIGHT · current mappings */}
          <Card
            title={<span className="vh-row" style={{ gap: 8 }}><ArrowRight size={16} aria-hidden /> Current mappings</span>}
            action={mappings.length > 0 ? <StatusPill tone="info">{mappings.length} mapped</StatusPill> : undefined}
          >
            {mappings.length === 0 ? (
              <EmptyState
                icon="🗂️"
                headline="No mappings yet"
                sub="Add your first mapping on the left, or run an import — AI will propose likely category matches for you to confirm."
              />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {mappings.map((m) => (
                  <div key={m.id} className="vh-row-between" style={{ gap: 12, flexWrap: "wrap", padding: "10px 0", borderBottom: "1px solid var(--vh-border)" }}>
                    <div className="vh-row" style={{ gap: 8, minWidth: 0, flexWrap: "wrap" }}>
                      <span className="mono small">{m.sourcePath}</span>
                      <ArrowRight size={13} aria-hidden style={{ color: "var(--vh-muted)", flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{m.targetLabel}</span>
                      {m.targetCategoryId && <span className="mono small muted">#{m.targetCategoryId}</span>}
                    </div>
                    {m.auto ? (
                      <span className="imp-chip on"><Sparkles size={12} aria-hidden style={{ marginRight: 4 }} />AI-mapped</span>
                    ) : (
                      <span className="imp-chip">manual</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </ImpShell>
    </Shell>
  );
}
