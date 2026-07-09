/**
 * VEDIC HEMP — CMS (§0.4 IA)
 *
 * Homepage, landing pages, blog, media library, FAQ and banners. Mostly
 * editorial surface — low compliance load compared to the rest of the
 * console, but page deletion still has a governance gate: deleting a page
 * with meaningful traffic is a maker–checker action, not a single click.
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, StatusPill, Banner } from "@/components/ui";

export const metadata: Metadata = { title: "CMS · Admin" };

const PAGES = [
  { id: "pg1", title: "Homepage", type: "Landing", views: 284_300, status: "PUBLISHED" },
  { id: "pg2", title: "Hemp Wellness — CBD guide", type: "Landing", views: 41_200, status: "PUBLISHED" },
  { id: "pg3", title: "Ayurveda 101", type: "Blog", views: 12_600, status: "PUBLISHED" },
  { id: "pg4", title: "Monsoon skincare routine", type: "Blog", views: 980, status: "DRAFT" },
  { id: "pg5", title: "Shipping & returns FAQ", type: "FAQ", views: 63_500, status: "PUBLISHED" },
];

const MEDIA = ["🖼️ hero-banner-monsoon.jpg", "🖼️ cbd-balm-lifestyle.jpg", "🎬 brand-story.mp4", "🖼️ ayurveda-ingredients.jpg"];

export default function AdminCmsPage() {
  return (
    <Shell active="/admin/cms" breadcrumb={["Admin", "CMS"]} title="Content management">
      <div className="vh-grid" style={{ gap: 18 }}>
        <Card title="Pages" pad0>
          <table className="vh-table">
            <thead><tr><th>Title</th><th>Type</th><th style={{ textAlign: "right" }}>Monthly views</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {PAGES.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.title}</td>
                  <td>{p.type}</td>
                  <td className="tabular" style={{ textAlign: "right" }}>{p.views.toLocaleString("en-IN")}</td>
                  <td><StatusPill tone={p.status === "PUBLISHED" ? "ok" : "neutral"}>{p.status}</StatusPill></td>
                  <td className="vh-row" style={{ gap: 6 }}>
                    <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/cms#${p.id}-edit`}>Edit</a>
                    <a className="vh-btn vh-btn-sm vh-btn-danger" href={`/admin/cms#${p.id}-delete`}>
                      {p.views > 1000 ? "Delete (needs checker)" : "Delete"}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Banner severity="info" title="Deletion gate">
          Deleting a page with more than 1,000 monthly views is a maker–checker action: the requesting editor
          proposes the deletion, and a second, different admin confirms before the page is actually removed. Pages
          under that threshold can be deleted by a single editor.
        </Banner>

        <div className="vh-grid cols-2">
          <Card title="Blog posts">
            <p className="small muted" style={{ marginTop: 0 }}>3 published · 1 draft awaiting editorial review</p>
            <a className="vh-btn vh-btn-sm vh-btn-ghost" href="#new-post">New post</a>
          </Card>
          <Card title="Media library">
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              {MEDIA.map((m) => <li key={m} className="small">{m}</li>)}
            </ul>
          </Card>
        </div>

        <div className="vh-grid cols-2">
          <Card title="FAQ">
            <p className="small muted" style={{ marginTop: 0 }}>18 entries across 5 categories — Orders, Shipping, Returns, CBD & Hemp basics, Prescriptions.</p>
          </Card>
          <Card title="Banners">
            <p className="small muted" style={{ marginTop: 0 }}>2 active homepage banners · 1 scheduled for the next festival sale.</p>
            <p className="small muted" style={{ margin: 0 }}>
              Banners advertising CBD Wellness still pass through the same copy-check as CBD ad creatives — no
              disease claims. Banners cannot reference MED_CANNABIS at all (A1).
            </p>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
