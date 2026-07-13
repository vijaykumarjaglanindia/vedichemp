/**
 * VEDIC HEMP — CMS (§0.4 IA)
 *
 * Homepage, landing pages, blog, media library, FAQ and banners. Mostly
 * editorial surface — low compliance load compared to the rest of the
 * console, but page deletion still has a governance gate: deleting a page
 * with meaningful traffic is a maker–checker action, not a single click.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Pencil, Trash2, Image as ImageIcon, Film, Newspaper, HelpCircle, GalleryHorizontal } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, Banner } from "@/components/ui";
import { MEDIA_ITEMS } from "../_lib/data";
import { allPosts } from "@/lib/cms";

export const metadata: Metadata = { title: "CMS · Admin" };

const I = { size: 16, strokeWidth: 2.2 } as const;
const IB = { size: 14, strokeWidth: 2.2 } as const;

const PAGES = [
  { id: "pg1", title: "Homepage", type: "Landing", views: 284_300, status: "PUBLISHED" },
  { id: "pg2", title: "Hemp Wellness — CBD guide", type: "Landing", views: 41_200, status: "PUBLISHED" },
  { id: "pg3", title: "Ayurveda 101", type: "Blog", views: 12_600, status: "PUBLISHED" },
  { id: "pg4", title: "Monsoon skincare routine", type: "Blog", views: 980, status: "DRAFT" },
  { id: "pg5", title: "Shipping & returns FAQ", type: "FAQ", views: 63_500, status: "PUBLISHED" },
];

export default async function AdminCmsPage({
  searchParams,
}: {
  searchParams: Promise<{ cms?: string }>;
}) {
  const { cms } = await searchParams;
  const posts = await allPosts();
  return (
    <Shell active="/admin/cms" breadcrumb={["Admin", "CMS"]} title="Content management">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><FileText {...I} aria-hidden /> Site content</span>}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Announcement bar, homepage hero and sections, FAQ, testimonials, footer disclosure and
            page metadata — every public copy surface, editable and published live from one place.
          </p>
          <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
            <Link className="vh-btn vh-btn-sm vh-btn-primary" href="/admin/cms/site">Edit site content</Link>
            <Link className="vh-btn vh-btn-sm vh-btn-outline" href="/admin/cms/pages">Page builder</Link>
            <Link className="vh-btn vh-btn-sm vh-btn-outline" href="/admin/cms/media">Media library</Link>
          </div>
        </Card>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><FileText {...I} aria-hidden /> Pages</span>} pad0>
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead><tr><th>Title</th><th>Type</th><th style={{ textAlign: "right" }}>Monthly views</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {PAGES.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.title}</td>
                    <td>{p.type}</td>
                    <td className="tabular" style={{ textAlign: "right" }}>{p.views.toLocaleString("en-IN")}</td>
                    <td><StatusPill tone={p.status === "PUBLISHED" ? "ok" : "neutral"}>{p.status}</StatusPill></td>
                    <td>
                      <div className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
                        <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/cms#${p.id}-edit`}>
                          <Pencil {...IB} aria-hidden /> Edit
                        </Link>
                        <Link className="vh-btn vh-btn-sm vh-btn-danger" href={`/admin/cms#${p.id}-delete`}>
                          <Trash2 {...IB} aria-hidden /> {p.views > 1000 ? "Delete (needs checker)" : "Delete"}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Banner severity="info" title="Deletion gate">
          Deleting a page with more than 1,000 monthly views is a maker–checker action: the requesting editor
          proposes the deletion, and a second, different admin confirms before the page is actually removed. Pages
          under that threshold can be deleted by a single editor.
        </Banner>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Newspaper {...I} aria-hidden /> Blog posts</span>}>
            {cms === "deleted" && (
              <div style={{ marginBottom: 10 }}>
                <Banner severity="ok">Post deleted.</Banner>
              </div>
            )}
            <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0, display: "grid", gap: 8 }} id="new-post">
              {posts.map((p) => (
                <li key={p.slug} className="vh-row-between" style={{ gap: 8, borderBottom: "1px solid var(--vh-line)", paddingBottom: 8 }}>
                  <span style={{ minWidth: 0 }}>
                    <span className="small" style={{ fontWeight: 700, color: "var(--vh-ink)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
                    <span className="small muted mono">/blog/{p.slug} · {p.updatedAt}</span>
                  </span>
                  <span className="vh-row" style={{ gap: 8, flexShrink: 0 }}>
                    <StatusPill tone={p.status === "PUBLISHED" ? "ok" : "neutral"}>{p.status}</StatusPill>
                    <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/cms/editor?slug=${p.slug}`}>Edit</Link>
                  </span>
                </li>
              ))}
            </ul>
            <Link className="vh-btn vh-btn-sm vh-btn-primary" href="/admin/cms/editor?slug=new">New post</Link>
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><ImageIcon {...I} aria-hidden /> Media library</span>}>
            <div className="vh-grid cols-3" style={{ gap: "var(--sp-2)" }}>
              {MEDIA_ITEMS.map((m) => (
                <div key={m.id} className="vh-card" style={{ padding: "var(--sp-2)", display: "grid", gap: 8 }}>
                  <div
                    aria-hidden
                    style={{
                      height: 56, borderRadius: 8, background: "var(--vh-bg-subtle)",
                      display: "grid", placeItems: "center", color: "var(--vh-accent)",
                    }}
                  >
                    {m.kind === "video" ? <Film size={20} strokeWidth={2.2} /> : <ImageIcon size={20} strokeWidth={2.2} />}
                  </div>
                  <div className="small" style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                    <div className="muted">{m.kind} · {m.size}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><HelpCircle {...I} aria-hidden /> FAQ</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>18 entries across 5 categories — Orders, Shipping, Returns, CBD & Hemp basics, Prescriptions.</p>
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><GalleryHorizontal {...I} aria-hidden /> Banners</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>2 active homepage banners · 1 scheduled for the next festival sale.</p>
            <p className="small muted" style={{ margin: 0 }}>
              Banners advertising CBD Wellness still pass through the same copy-check as CBD ad creatives — no
              disease claims. Banners cannot reference MED_CANNABIS at all (A1). Paid banner slots are configured in{" "}
              <Link href="/admin/ads">Admin → Ads</Link> and always render through <code>AdSlot</code>.
            </p>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
