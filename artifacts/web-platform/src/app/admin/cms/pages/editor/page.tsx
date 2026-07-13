/**
 * VEDIC HEMP — PAGE BUILDER (block editor)
 *
 * One card per block: edit its fields, move it up/down, remove it. Add
 * blocks from the palette. Publish when ready — classic-WordPress flow,
 * plain forms + server actions, zero client JS required.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Eye, Send, Trash2 } from "lucide-react";
import { Shell } from "../../../Shell";
import { Banner, Card, StatusPill } from "@/components/ui";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { BLOCK_META, findPage, type BlockType } from "@/lib/pagebuilder";
import { editBuiltPage } from "../actions";

export const metadata: Metadata = { title: "Page builder · Admin" };
export const dynamic = "force-dynamic";

const NOTES: Record<string, { sev: "ok" | "danger" | "warn"; text: string }> = {
  created: { sev: "ok", text: "Page created — add blocks below, then publish." },
  saved: { sev: "ok", text: "Block saved." },
  added: { sev: "ok", text: "Block added at the bottom — move it into place." },
  moved: { sev: "ok", text: "Block moved." },
  removed: { sev: "ok", text: "Block removed." },
  published: { sev: "ok", text: "Published — the page is live at its public URL." },
  unpublished: { sev: "warn", text: "Unpublished — the public URL now returns not-found." },
  claims: { sev: "danger", text: "Not saved — a field contains claims language (cure/treat/prevent/heal). No block on any page may carry a disease claim." },
  blocks: { sev: "danger", text: "Block limit reached for this page (16)." },
  exists: { sev: "warn", text: "A page with that title already exists — you are editing it." },
};

export default async function PageBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; pg?: string }>;
}) {
  const { slug = "", pg } = await searchParams;
  const page = await findPage(slug);

  if (!page) {
    return (
      <Shell active="/admin/cms" breadcrumb={["Admin", "Pages", "Not found"]} title="Page not found">
        <Banner severity="danger">No page with that slug — <Link href="/admin/cms/pages">back to Pages</Link>.</Banner>
      </Shell>
    );
  }

  return (
    <Shell
      active="/admin/cms"
      breadcrumb={["Admin", "Pages", page.title]}
      title={`Build: ${page.title}`}
      actions={
        <span className="vh-row" style={{ gap: 8 }}>
          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/cms/pages"><ArrowLeft size={14} aria-hidden /> Pages</Link>
          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/p/${page.slug}${page.status === "DRAFT" ? "?preview=1" : ""}`}>
            <Eye size={14} aria-hidden /> {page.status === "PUBLISHED" ? "View live" : "Preview"}
          </Link>
        </span>
      }
    >
      <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
        {pg && NOTES[pg] && <Banner severity={NOTES[pg].sev}>{NOTES[pg].text}</Banner>}

        <div className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
          <StatusPill tone={page.status === "PUBLISHED" ? "ok" : "neutral"}>{page.status}</StatusPill>
          <span className="small mono muted">/p/{page.slug}</span>
          <span className="vh-spacer" />
          <form action={editBuiltPage} className="vh-row" style={{ gap: 8 }}>
            <input type="hidden" name="slug" value={page.slug} />
            {page.status === "PUBLISHED" ? (
              <button className="vh-btn vh-btn-sm vh-btn-outline" type="submit" name="intent" value="unpublish">Unpublish</button>
            ) : (
              <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit" name="intent" value="publish"><Send size={13} aria-hidden /> Publish</button>
            )}
            <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit" name="intent" value="delete-page"><Trash2 size={13} aria-hidden /> Delete page</button>
          </form>
        </div>

        {page.blocks.length === 0 && (
          <Card><p className="small muted" style={{ margin: 0 }}>No blocks yet — add your first one below.</p></Card>
        )}

        {page.blocks.map((block, i) => {
          const meta = BLOCK_META[block.type];
          return (
            <Card
              key={block.id}
              title={
                <span className="vh-row-between" style={{ width: "100%" }}>
                  <span><span className="small muted tabular" style={{ marginRight: 8 }}>{i + 1}.</span>{meta.label}</span>
                  <form action={editBuiltPage} className="vh-row" style={{ gap: 6 }}>
                    <input type="hidden" name="slug" value={page.slug} />
                    <input type="hidden" name="blockId" value={block.id} />
                    <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit" name="intent" value="move-up" aria-label="Move block up" disabled={i === 0}><ArrowUp size={13} aria-hidden /></button>
                    <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit" name="intent" value="move-down" aria-label="Move block down" disabled={i === page.blocks.length - 1}><ArrowDown size={13} aria-hidden /></button>
                    <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit" name="intent" value="delete-block" aria-label="Remove block"><Trash2 size={13} aria-hidden /></button>
                  </form>
                </span>
              }
            >
              <form action={editBuiltPage} className="vh-grid" style={{ gap: 12 }}>
                <input type="hidden" name="slug" value={page.slug} />
                <input type="hidden" name="blockId" value={block.id} />
                {meta.fields.map((field) => (
                  <div key={field.key} className="vh-field">
                    <label className="vh-label" htmlFor={`${block.id}-${field.key}`}>{field.label}</label>
                    {field.kind === "rich" ? (
                      <RichTextEditor name={field.key} id={`${block.id}-${field.key}`} defaultValue={block.props[field.key] ?? ""} maxLength={field.max} minHeight={120} help={field.help} />
                    ) : (
                      <>
                        <input className="vh-input" id={`${block.id}-${field.key}`} name={field.key} maxLength={field.max} defaultValue={block.props[field.key] ?? ""} />
                        {field.help && <span className="vh-help">{field.help}</span>}
                      </>
                    )}
                  </div>
                ))}
                <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit" name="intent" value="update-block" style={{ justifySelf: "start" }}>Save block</button>
              </form>
            </Card>
          );
        })}

        <Card title="Add a block">
          <form action={editBuiltPage} className="vh-row" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <input type="hidden" name="slug" value={page.slug} />
            <div className="vh-field" style={{ minWidth: 220 }}>
              <label className="vh-label" htmlFor="add-type">Block type</label>
              <select className="vh-select" id="add-type" name="type" defaultValue="richtext">
                {(Object.keys(BLOCK_META) as BlockType[]).map((t) => (
                  <option key={t} value={t}>{BLOCK_META[t].label}</option>
                ))}
              </select>
            </div>
            <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit" name="intent" value="add-block">Add block</button>
          </form>
          <p className="small muted" style={{ margin: "10px 0 0" }}>
            Images come from the <Link href="/admin/cms/media">Media Library</Link> — upload there, paste the media ID here.
            Every text field passes the claims copy-check on save.
          </p>
        </Card>
      </div>
    </Shell>
  );
}
