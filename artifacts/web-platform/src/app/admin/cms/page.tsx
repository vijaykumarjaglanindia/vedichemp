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
import { FileText, Image as ImageIcon, Newspaper, HelpCircle, GalleryHorizontal, Plus } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, Banner, EmptyState } from "@/components/ui";
import { allPosts } from "@/lib/cms";
import { listPages, listMedia } from "@/lib/pagebuilder";

export const metadata: Metadata = { title: "CMS · Admin" };
export const dynamic = "force-dynamic";

const I = { size: 16, strokeWidth: 2.2 } as const;

export default async function AdminCmsPage({
  searchParams,
}: {
  searchParams: Promise<{ cms?: string }>;
}) {
  const { cms } = await searchParams;
  const posts = await allPosts();
  const pages = await listPages();
  const media = await listMedia();
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
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><FileText {...I} aria-hidden /> Custom pages</span>}
          action={<Link className="vh-btn vh-btn-sm vh-btn-primary vh-row" href="/admin/cms/pages" style={{ gap: 6 }}><Plus size={14} aria-hidden /> Page builder</Link>}
          pad0
        >
          {pages.length === 0 ? (
            <div style={{ padding: 16 }}>
              <EmptyState icon="📄" headline="No custom pages yet" sub="Build landing pages from blocks in the Page builder — each one publishes to /p/<slug>." />
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="vh-table">
                <thead><tr><th>Title</th><th>URL</th><th style={{ textAlign: "right" }}>Blocks</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
                <tbody>
                  {pages.map((p) => (
                    <tr key={p.slug}>
                      <td style={{ fontWeight: 600 }}>{p.title}</td>
                      <td className="small mono">/p/{p.slug}</td>
                      <td className="tabular" style={{ textAlign: "right" }}>{p.blocks.length}</td>
                      <td><StatusPill tone={p.status === "PUBLISHED" ? "ok" : "neutral"}>{p.status}</StatusPill></td>
                      <td className="small muted tabular">{p.updatedAt}</td>
                      <td>
                        <div className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
                          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/cms/pages/editor?slug=${encodeURIComponent(p.slug)}`}>Edit</Link>
                          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/p/${p.slug}${p.status === "DRAFT" ? "?preview=1" : ""}`}>{p.status === "PUBLISHED" ? "View" : "Preview"}</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Banner severity="info" title="Deletion is protected, not casual">
          High-traffic and seed blog posts cannot be removed by a single editor — the delete is refused
          and the attempt is logged (see the <Link href="/admin/cms/editor?slug=new">post editor</Link>). Custom
          pages and media are created and removed in their own libraries; every change lands in the{" "}
          <Link href="/admin/audit">audit trail</Link>.
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
          <Card
            title={<span className="vh-row" style={{ gap: 8 }}><ImageIcon {...I} aria-hidden /> Media library</span>}
            action={<Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/cms/media">Manage →</Link>}
          >
            {media.length === 0 ? (
              <EmptyState icon="🖼️" headline="No media uploaded yet" sub="Upload images in the Media library, then drop them into an Image block or a listing." />
            ) : (
              <div className="vh-grid cols-3" style={{ gap: "var(--sp-2)" }}>
                {media.slice(0, 6).map((m) => (
                  <div key={m.id} className="vh-card" style={{ padding: "var(--sp-2)", display: "grid", gap: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.dataUrl} alt={m.alt || m.name} style={{ height: 56, width: "100%", objectFit: "cover", borderRadius: 8, background: "var(--vh-bg-subtle)" }} />
                    <div className="small" style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                      <div className="muted mono">{m.id} · {m.addedAt}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><HelpCircle {...I} aria-hidden /> FAQ</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>Help-centre questions are edited under Site content — grouped by Orders, Shipping, Returns, CBD &amp; Hemp basics and Prescriptions.</p>
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><GalleryHorizontal {...I} aria-hidden /> Banners</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>Homepage banners are managed under Site content and can be scheduled for a date window.</p>
            <p className="small muted" style={{ margin: 0 }}>
              Banners advertising CBD Wellness still pass through the same copy-check as CBD ad creatives — no
              disease claims. Banners cannot reference MED_CANNABIS at all. Paid banner slots are configured in{" "}
              <Link href="/admin/ads">Admin → Ads</Link> and always render through <code>AdSlot</code>.
            </p>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
