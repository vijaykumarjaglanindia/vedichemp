"use server";

/**
 * VEDIC HEMP — FEATURES / THEME / IMPORT actions
 *
 * The switchboard flips optional surfaces only — compliance gates are not
 * features and have no switch here. Import applies a previously exported
 * content bundle (site content, journal posts, built pages) after the same
 * validation every editor goes through.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-lite";
import { writeAudit } from "@/lib/audit";
import { CLAIMS_LANGUAGE } from "@/lib/claims";
import { FEATURE_DEFS, writeFeatures, writeThemePreset } from "@/lib/features";
import { writeSiteContent, siteField } from "@/lib/sitecontent";
import { findPost, writePostOverride, MAX_BODY } from "@/lib/cms";
import { findPage, savePage, createPage } from "@/lib/pagebuilder";

async function actor(): Promise<string> {
  return (await getSession())?.email ?? "unknown-admin";
}

export async function saveFeatures(formData: FormData): Promise<void> {
  const flags: Record<string, boolean> = {};
  for (const f of FEATURE_DEFS) flags[f.key] = formData.get(f.key) === "on";
  await writeFeatures(flags);
  const off = FEATURE_DEFS.filter((f) => !flags[f.key]).map((f) => f.key).join(",") || "none";
  await writeAudit({ actor: await actor(), action: "FEATURES_SAVE", target: "switchboard", outcome: "OK", note: `off: ${off}` });
  redirect("/admin/features?ft=saved");
}

export async function saveTheme(formData: FormData): Promise<void> {
  const key = String(formData.get("preset") ?? "classic");
  const ok = await writeThemePreset(key);
  if (!ok) redirect("/admin/features?ft=theme-bad");
  await writeAudit({ actor: await actor(), action: "THEME_SET", target: key, outcome: "OK" });
  redirect("/admin/features?ft=theme");
}

interface ContentBundle {
  siteContent?: Record<string, string>;
  posts?: { slug: string; title: string; body: string; status: "DRAFT" | "PUBLISHED" }[];
  pages?: { slug: string; title: string; status: "DRAFT" | "PUBLISHED"; blocks: { id: string; type: string; props: Record<string, string> }[] }[];
}

export async function importContent(formData: FormData): Promise<void> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 512 * 1024) redirect("/admin/features?ft=imp-file");
  let bundle: ContentBundle;
  try {
    bundle = JSON.parse(await file.text()) as ContentBundle;
  } catch {
    redirect("/admin/features?ft=imp-parse");
  }

  let applied = 0;
  // Site content — field-validated, claims-checked, unknown keys ignored.
  if (bundle!.siteContent) {
    const patch: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(bundle!.siteContent)) {
      const field = siteField(key);
      if (!field || typeof value !== "string") continue;
      if (!field.allowClaimVerbs && CLAIMS_LANGUAGE.test(value)) continue; // skip, never import a claim
      patch[key] = value.slice(0, field.max) || null;
      applied++;
    }
    await writeSiteContent(patch);
  }
  // Journal posts — same rules as the editor.
  for (const p of bundle!.posts ?? []) {
    if (!p.slug || !p.title || !p.body) continue;
    if (p.title.length > 90 || p.body.length > MAX_BODY) continue;
    if (CLAIMS_LANGUAGE.test(p.title) || CLAIMS_LANGUAGE.test(p.body)) continue;
    const prior = await findPost(p.slug);
    await writePostOverride({
      slug: p.slug.slice(0, 60), title: p.title, body: p.body,
      status: p.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      updatedAt: new Date().toISOString().slice(0, 10),
      sample: prior?.sample ?? false,
    });
    applied++;
  }
  // Built pages — block text claims-checked prop by prop.
  for (const pg of bundle!.pages ?? []) {
    if (!pg.slug || !pg.title || !Array.isArray(pg.blocks)) continue;
    const clean = pg.blocks
      .filter((b) => b && typeof b.type === "string" && b.props)
      .map((b, i) => ({
        id: `b${i}${Math.random().toString(36).slice(2, 6)}`,
        type: b.type as never,
        props: Object.fromEntries(
          Object.entries(b.props).filter(([, v]) => typeof v === "string" && !CLAIMS_LANGUAGE.test(v)).map(([k, v]) => [k, String(v).slice(0, 2000)]),
        ),
      }));
    if (!(await findPage(pg.slug))) await createPage(pg.slug.slice(0, 60), pg.title.slice(0, 80));
    const target = await findPage(pg.slug);
    if (target) {
      target.title = pg.title.slice(0, 80);
      target.status = pg.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
      target.blocks = clean;
      await savePage(target);
      applied++;
    }
  }

  await writeAudit({ actor: await actor(), action: "CONTENT_IMPORT", target: file.name.slice(0, 60), outcome: "OK", note: `${applied} items applied` });
  redirect(`/admin/features?ft=imported&n=${applied}`);
}
