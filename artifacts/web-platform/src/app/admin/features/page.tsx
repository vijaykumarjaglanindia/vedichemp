/**
 * VEDIC HEMP — FEATURES, THEME & TOOLS (the WordPress plugin panel)
 *
 * On/off switches for every optional surface, curated light-only theme
 * presets, and content export/import. Compliance gates are conspicuously
 * absent: the CoA gate, the 21+ age gate, the claims copy-check and the
 * prescription rules are not features and cannot be switched off.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Download, Palette, ToggleRight, Upload } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, StatusPill } from "@/components/ui";
import { FEATURE_DEFS, THEME_PRESETS, readFeatures, readThemePreset } from "@/lib/features";
import { withBase } from "@/lib/base";
import { importContent, saveFeatures, saveTheme } from "./actions";

export const metadata: Metadata = { title: "Features & tools · Admin" };
export const dynamic = "force-dynamic";

export default async function FeaturesPage({
  searchParams,
}: {
  searchParams: Promise<{ ft?: string; n?: string }>;
}) {
  const { ft, n } = await searchParams;
  const flags = await readFeatures();
  const theme = await readThemePreset();

  return (
    <Shell active="/admin/settings" breadcrumb={["Admin", "Features & tools"]} title="Features & tools">
      <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
        {ft === "saved" && <Banner severity="ok" title="Features saved">Switched-off sections disappear from public pages on the next request.</Banner>}
        {ft === "theme" && <Banner severity="ok" title="Theme applied">The preset is live site-wide — light theme with dark type, always.</Banner>}
        {ft === "imported" && <Banner severity="ok" title={`Import applied — ${n ?? "0"} items`}>Anything carrying claims language was skipped, never imported.</Banner>}
        {ft === "imp-file" && <Banner severity="danger">Pick a JSON bundle up to 512KB.</Banner>}
        {ft === "imp-parse" && <Banner severity="danger">That file isn&rsquo;t valid JSON.</Banner>}

        <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><ToggleRight size={16} strokeWidth={2.2} aria-hidden /> Feature switchboard</span>}>
            <form action={saveFeatures} className="vh-grid" style={{ gap: 12 }}>
              {FEATURE_DEFS.map((f) => (
                <label key={f.key} className="vh-row" style={{ gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                  <input type="checkbox" name={f.key} defaultChecked={flags[f.key]} style={{ marginTop: 3 }} />
                  <span>
                    <span style={{ fontWeight: 700, display: "block", color: "var(--vh-ink)" }}>{f.label}</span>
                    <span className="small muted">{f.help}</span>
                  </span>
                </label>
              ))}
              <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit" style={{ justifySelf: "start" }}>Save features</button>
            </form>
            <p className="small muted" style={{ margin: "12px 0 0" }}>
              No compliance gate appears here. The CoA gate (A2), the 21+ age gate, the claims
              copy-check and prescription rules have no off switch, for anyone.
            </p>
          </Card>

          <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
            <Card title={<span className="vh-row" style={{ gap: 8 }}><Palette size={16} strokeWidth={2.2} aria-hidden /> Theme preset</span>}>
              <form action={saveTheme} className="vh-grid" style={{ gap: 10 }}>
                {THEME_PRESETS.map((t) => (
                  <label key={t.key} className="vh-row" style={{ gap: 10, cursor: "pointer" }}>
                    <input type="radio" name="preset" value={t.key} defaultChecked={theme.key === t.key} />
                    <span style={{ fontWeight: 700, color: "var(--vh-ink)" }}>{t.label}</span>
                    {t.accent && <span aria-hidden style={{ width: 18, height: 18, borderRadius: 6, background: t.accent, border: "1px solid var(--vh-line)" }} />}
                    {theme.key === t.key && <StatusPill tone="ok">Active</StatusPill>}
                  </label>
                ))}
                <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit" style={{ justifySelf: "start" }}>Apply theme</button>
              </form>
              <p className="small muted" style={{ margin: "10px 0 0" }}>
                Every preset is light theme with dark fonts — darkness is not a preset and never will be.
              </p>
            </Card>

            <Card title={<span className="vh-row" style={{ gap: 8 }}><Download size={16} strokeWidth={2.2} aria-hidden /> Export & import</span>}>
              <p className="small muted" style={{ marginTop: 0 }}>
                One JSON bundle: site-content overrides, journal posts and built pages.
              </p>
              <a className="vh-btn vh-btn-outline vh-btn-sm" href={withBase("/api/v1/admin/content/export")} download>
                <Download size={13} aria-hidden /> Export content
              </a>
              <form action={importContent} className="vh-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
                <div className="vh-field" style={{ flex: "1 1 200px" }}>
                  <label className="vh-label" htmlFor="imp-file">Import a bundle</label>
                  <input className="vh-input" id="imp-file" name="file" type="file" accept="application/json" required />
                </div>
                <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit"><Upload size={13} aria-hidden /> Import</button>
              </form>
              <p className="small muted" style={{ margin: "8px 0 0" }}>
                Imports run through the same validation as the editors — anything carrying claims
                language is skipped, and the import is logged in the <Link href="/admin/audit">audit trail</Link>.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
