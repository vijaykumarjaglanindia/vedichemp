/**
 * VEDIC HEMP — MEDIA LIBRARY (WordPress "Media")
 *
 * Upload → grid → use anywhere by ID. Alt text is mandatory (accessibility
 * is not optional). Storage is the R2/S3 seam — assets are held server-side
 * as data URLs in the demo and swap to object storage without UI changes.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { Shell } from "../../Shell";
import { Banner, Card } from "@/components/ui";
import { MAX_MEDIA, MAX_MEDIA_BYTES, listMedia } from "@/lib/pagebuilder";
import { removeMedia, uploadMedia } from "../pages/actions";

export const metadata: Metadata = { title: "Media library · Admin" };
export const dynamic = "force-dynamic";

const NOTES: Record<string, { sev: "ok" | "danger"; text: string }> = {
  ok: { sev: "ok", text: "Uploaded. Use the media ID in an Image block or paste it into a listing." },
  deleted: { sev: "ok", text: "Asset deleted. Pages referencing it show their caption only." },
  file: { sev: "danger", text: "Pick a file to upload." },
  alt: { sev: "danger", text: "Alt text is required — screen readers depend on it." },
  size: { sev: "danger", text: `Demo cap is ${Math.round(MAX_MEDIA_BYTES / 1024)}KB per file (object storage removes this).` },
  type: { sev: "danger", text: "PNG, JPEG, WebP or SVG only." },
  limit: { sev: "danger", text: `Demo limit: ${MAX_MEDIA} assets. Delete one first.` },
};

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ md?: string; id?: string }>;
}) {
  const { md, id } = await searchParams;
  const assets = await listMedia();
  return (
    <Shell
      active="/admin/cms"
      breadcrumb={["Admin", "Content & CMS", "Media library"]}
      title="Media library"
      actions={<Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/cms"><ArrowLeft size={14} aria-hidden /> All content</Link>}
    >
      <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
        {md && NOTES[md] && (
          <Banner severity={NOTES[md].sev}>
            {NOTES[md].text}{md === "ok" && id ? <> Media ID: <strong className="mono">{id}</strong></> : null}
          </Banner>
        )}

        <Card title={<span className="vh-row" style={{ gap: 8 }}><ImagePlus size={16} strokeWidth={2.2} aria-hidden /> Upload</span>}>
          <form action={uploadMedia} className="vh-row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="vh-field">
              <label className="vh-label" htmlFor="md-file">Image file <span className="req">*</span></label>
              <input className="vh-input" id="md-file" name="file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" required />
            </div>
            <div className="vh-field" style={{ flex: "1 1 240px" }}>
              <label className="vh-label" htmlFor="md-alt">Alt text <span className="req">*</span></label>
              <input className="vh-input" id="md-alt" name="alt" required maxLength={160} placeholder="What the image shows, for screen readers" />
            </div>
            <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit">Upload</button>
          </form>
        </Card>

        <Card title={`Library (${assets.length}/${MAX_MEDIA})`}>
          {assets.length === 0 ? (
            <p className="small muted" style={{ margin: 0 }}>Nothing uploaded yet.</p>
          ) : (
            <div className="vh-grid cols-4">
              {assets.map((a) => (
                <div key={a.id} style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URLs; swaps to next/image with object storage */}
                  <img src={a.dataUrl} alt={a.alt} style={{ width: "100%", height: 110, objectFit: "cover", display: "block", background: "var(--vh-bg-subtle)" }} />
                  <div style={{ padding: "8px 10px" }}>
                    <div className="small" style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                    <div className="small muted mono">{a.id}</div>
                    <form action={removeMedia} style={{ marginTop: 6 }}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Delete</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
}
