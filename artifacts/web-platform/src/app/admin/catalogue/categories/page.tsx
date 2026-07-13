/**
 * VEDIC HEMP — CATEGORY MANAGER (admin, full CRUD)
 *
 * Create, edit, hide/show and delete the merchandising categories the public
 * catalogue renders as collections. Editorial only: a category can point at
 * a compliance class as its filter, but it can never target MED_CANNABIS
 * (A1 — a public collection page IS promotion; the store refuses and the
 * attempt is audited), and it never changes any product's class. Launch
 * categories can be edited and hidden but not deleted — printed links to
 * them must keep resolving.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FolderPlus, Tags } from "lucide-react";
import { Shell } from "../../Shell";
import { Banner, Card, StatusPill } from "@/components/ui";
import { CATEGORY_CLASSES, readCategories } from "@/lib/categories";
import { CLASS_META } from "@/lib/compliance";
import { removeCategory, saveCategory, toggleCategory } from "../../actions";

export const metadata: Metadata = { title: "Categories · Admin" };

const MESSAGES: Record<string, { severity: "ok" | "danger" | "warn"; title: string; body: string }> = {
  saved: { severity: "ok", title: "Category saved", body: "The catalogue's collection chips update immediately for every visitor." },
  deleted: { severity: "ok", title: "Category deleted", body: "Its collection URL now falls back to the full catalogue." },
  name: { severity: "danger", title: "Name should be 3–40 characters", body: "Short, buyer-facing collection names work best." },
  blurb: { severity: "danger", title: "Blurb too long", body: "Keep the description under 140 characters." },
  claims: { severity: "danger", title: "Claims language rejected", body: "Category copy is public marketing copy — the same copy-check applies (no cure/treat/prevent). The attempt was logged." },
  a1: { severity: "danger", title: "Refused: no medical collection (A1)", body: "A public collection page is promotion, and MED_CANNABIS may never be promoted — by anyone. The attempt is in the audit trail." },
  fixture: { severity: "warn", title: "Launch categories can't be deleted", body: "Hide it instead — printed links to its URL keep resolving." },
  state: { severity: "warn", title: "Nothing to change", body: "That category no longer exists." },
};

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const categories = await readCategories({ includeHidden: true });
  const msg = cat ? MESSAGES[cat] : undefined;

  return (
    <Shell active="/admin/catalogue" breadcrumb={["Admin", "Catalogue", "Categories"]} title="Categories"
      actions={
        <Link href="/admin/catalogue" className="vh-btn vh-btn-sm vh-btn-ghost vh-row" style={{ gap: 6 }}>
          <ArrowLeft size={14} strokeWidth={2.2} aria-hidden /> Catalogue admin
        </Link>
      }
    >
      {msg && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity={msg.severity} title={msg.title}>{msg.body}</Banner>
        </div>
      )}

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        {/* ── Create ────────────────────────────────────────── */}
        <Card title={<span className="vh-row" style={{ gap: 8 }}><FolderPlus size={16} strokeWidth={2.2} aria-hidden /> New category</span>}>
          <form action={saveCategory} className="vh-grid" style={{ gap: 14 }} id="new-category">
            <div className="vh-field">
              <label className="vh-label" htmlFor="cat-name">Name <span className="req">*</span></label>
              <input className="vh-input" id="cat-name" name="name" type="text" maxLength={40} placeholder="e.g. Sleep & calm" />
            </div>
            <div className="vh-field">
              <label className="vh-label" htmlFor="cat-blurb">Blurb</label>
              <input className="vh-input" id="cat-blurb" name="blurb" type="text" maxLength={140} placeholder="One line shown on hover — composition and routine copy only." />
              <span className="vh-help">Public copy — the claims copy-check applies here too.</span>
            </div>
            <div className="vh-grid cols-2" style={{ gap: 14 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="cat-emoji">Emoji</label>
                <input className="vh-input" id="cat-emoji" name="emoji" type="text" maxLength={4} placeholder="🌙" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="cat-cls">Class filter</label>
                <select className="vh-input" id="cat-cls" name="cls" defaultValue="">
                  <option value="">All permitted classes</option>
                  {CATEGORY_CLASSES.map((c) => (
                    <option key={c} value={c}>{CLASS_META[c].label}</option>
                  ))}
                </select>
                <span className="vh-help">MED_CANNABIS is not offered and is refused server-side (A1).</span>
              </div>
            </div>
            <div className="vh-field">
              <label className="vh-label" htmlFor="cat-q">Search phrase filter</label>
              <input className="vh-input" id="cat-q" name="q" type="text" maxLength={60} placeholder="e.g. protein" />
              <span className="vh-help">Optional — composes with the class filter using the same synonym/typo matcher as search.</span>
            </div>
            <button className="vh-btn vh-btn-primary" type="submit">Create category</button>
          </form>
        </Card>

        {/* ── Existing (edit inline) ────────────────────────── */}
        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          {categories.map((c) => (
            <Card
              key={c.id}
              title={<span className="vh-row" style={{ gap: 8 }}><Tags size={15} strokeWidth={2.2} aria-hidden /> {c.emoji} {c.name}</span>}
              action={
                <span className="vh-row" style={{ gap: 8 }}>
                  <StatusPill tone={c.visible ? "ok" : "warn"}>{c.visible ? "Visible" : "Hidden"}</StatusPill>
                  {!c.custom && <StatusPill tone="neutral">Launch</StatusPill>}
                </span>
              }
            >
              <form action={saveCategory} className="vh-grid" style={{ gap: 10 }}>
                <input type="hidden" name="categoryId" value={c.id} />
                <div className="vh-grid cols-2" style={{ gap: 10 }}>
                  <input className="vh-input" name="name" defaultValue={c.name} maxLength={40} aria-label={`Name for ${c.name}`} />
                  <input className="vh-input" name="emoji" defaultValue={c.emoji} maxLength={4} aria-label={`Emoji for ${c.name}`} />
                </div>
                <input className="vh-input" name="blurb" defaultValue={c.blurb} maxLength={140} aria-label={`Blurb for ${c.name}`} />
                <div className="vh-grid cols-2" style={{ gap: 10 }}>
                  <select className="vh-input" name="cls" defaultValue={c.cls ?? ""} aria-label={`Class filter for ${c.name}`}>
                    <option value="">All permitted classes</option>
                    {CATEGORY_CLASSES.map((cc) => (
                      <option key={cc} value={cc}>{CLASS_META[cc].label}</option>
                    ))}
                  </select>
                  <input className="vh-input" name="q" defaultValue={c.q ?? ""} maxLength={60} placeholder="Search phrase filter" aria-label={`Search filter for ${c.name}`} />
                </div>
                <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Save</button>
                  <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/catalogue?cat=${c.slug}`}>View collection</Link>
                </div>
              </form>
              <div className="vh-row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <form action={toggleCategory} style={{ display: "inline-flex" }}>
                  <input type="hidden" name="categoryId" value={c.id} />
                  <input type="hidden" name="visible" value={c.visible ? "0" : "1"} />
                  <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">{c.visible ? "Hide from catalogue" : "Show in catalogue"}</button>
                </form>
                {c.custom && (
                  <form action={removeCategory} style={{ display: "inline-flex" }}>
                    <input type="hidden" name="categoryId" value={c.id} />
                    <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Delete</button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <p className="small muted" style={{ marginTop: "var(--sp-3)" }}>
        Every create, edit, hide and delete here is audited — including refused attempts (a medical collection,
        claims language, deleting a launch category). What someone tried to do is often more informative than
        what they did.
      </p>
    </Shell>
  );
}
