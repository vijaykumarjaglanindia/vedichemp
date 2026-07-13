/**
 * VEDIC HEMP — CONTENT EXPORT (WordPress-style tools)
 *
 * Downloads the editable content universe as one JSON bundle: site-content
 * overrides, journal posts, and built pages. Admin-only. Media is excluded
 * from the bundle (assets export via object storage in production).
 */

import { getSession } from "@/lib/auth-lite";
import { allPosts } from "@/lib/cms";
import { listPages } from "@/lib/pagebuilder";
import { SITE_FIELDS, readSiteContent } from "@/lib/sitecontent";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    return Response.json({ error: "FORBIDDEN", detail: "Admin session required." }, { status: 403 });
  }

  const content = await readSiteContent();
  // Export only values that differ from defaults — the bundle stays a diff.
  const siteContent: Record<string, string> = {};
  for (const f of SITE_FIELDS) {
    const v = content[f.key];
    if (v !== undefined && v !== f.def) siteContent[f.key] = v;
  }
  const posts = (await allPosts()).map((p) => ({ slug: p.slug, title: p.title, body: p.body, status: p.status }));
  const pages = (await listPages()).map((p) => ({ slug: p.slug, title: p.title, status: p.status, blocks: p.blocks }));

  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), siteContent, posts, pages }, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="vedichemp-content.json"',
    },
  });
}
