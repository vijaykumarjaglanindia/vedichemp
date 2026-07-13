/**
 * VEDIC HEMP — PAGES (WordPress "Pages" list)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LayoutTemplate, Plus } from "lucide-react";
import { Shell } from "../../Shell";
import { Banner, Card, StatusPill } from "@/components/ui";
import { listPages } from "@/lib/pagebuilder";
import { createBuiltPage } from "./actions";

export const metadata: Metadata = { title: "Pages · Admin" };
export const dynamic = "force-dynamic";

const NOTES: Record<string, { sev: "ok" | "danger"; text: string }> = {
  title: { sev: "danger", text: "Titles need 4–80 characters." },
  claims: { sev: "danger", text: "The copy-check rejected claims language in the title." },
  limit: { sev: "danger", text: "Demo limit: up to 12 built pages." },
  deleted: { sev: "ok", text: "Page deleted." },
};

export default async function PagesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ pg?: string }>;
}) {
  const { pg } = await searchParams;
  const pages = await listPages();
  return (
    <Shell
      active="/admin/cms"
      breadcrumb={["Admin", "Content & CMS", "Pages"]}
      title="Pages"
      actions={<Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/cms"><ArrowLeft size={14} aria-hidden /> All content</Link>}
    >
      <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
        {pg && NOTES[pg] && <Banner severity={NOTES[pg].sev}>{NOTES[pg].text}</Banner>}

        <Card title={<span className="vh-row" style={{ gap: 8 }}><Plus size={16} strokeWidth={2.2} aria-hidden /> New page</span>}>
          <form action={createBuiltPage} className="vh-row" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="vh-field" style={{ flex: "1 1 260px" }}>
              <label className="vh-label" htmlFor="np-title">Page title <span className="req">*</span></label>
              <input className="vh-input" id="np-title" name="title" required minLength={4} maxLength={80} placeholder="e.g. Monsoon Wellness Guide" />
              <span className="vh-help">The URL becomes /p/&lt;slug-from-title&gt;. Build it from blocks in the editor.</span>
            </div>
            <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit">Create & open builder</button>
          </form>
        </Card>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><LayoutTemplate size={16} strokeWidth={2.2} aria-hidden /> All pages</span>} pad0>
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead><tr><th>Title</th><th>URL</th><th>Blocks</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
              <tbody>
                {pages.length === 0 ? (
                  <tr><td colSpan={6} className="small muted" style={{ padding: 16 }}>No built pages yet — create one above. Blocks: hero, rich text, product row, FAQ, CTA band, image.</td></tr>
                ) : pages.map((p) => (
                  <tr key={p.slug}>
                    <td style={{ fontWeight: 700 }}>{p.title}</td>
                    <td className="small mono">/p/{p.slug}</td>
                    <td className="small tabular">{p.blocks.length}</td>
                    <td><StatusPill tone={p.status === "PUBLISHED" ? "ok" : "neutral"}>{p.status}</StatusPill></td>
                    <td className="small tabular">{p.updatedAt}</td>
                    <td className="vh-row" style={{ gap: 6 }}>
                      <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/cms/pages/editor?slug=${p.slug}`}>Edit</Link>
                      <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/p/${p.slug}${p.status === "DRAFT" ? "?preview=1" : ""}`}>
                        {p.status === "PUBLISHED" ? "View" : "Preview"}
                      </Link>
                    </td>
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
