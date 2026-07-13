"use server";

/**
 * VEDIC HEMP — PAGE BUILDER + MEDIA ACTIONS
 *
 * Classic-WordPress ergonomics: every button is a plain form post handled
 * here. All text passes the claims copy-check; every mutation is audited.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-lite";
import { writeAudit } from "@/lib/audit";
import { CLAIMS_LANGUAGE } from "@/lib/claims";
import { slugify } from "@/lib/cms";
import {
  BLOCK_META,
  MAX_MEDIA_BYTES,
  addMedia,
  canAddBlock,
  createPage,
  deleteMedia,
  deletePage,
  findPage,
  newBlockId,
  savePage,
  type BlockType,
} from "@/lib/pagebuilder";

async function actor(): Promise<string> {
  return (await getSession())?.email ?? "unknown-admin";
}

const editorUrl = (slug: string, q: string) => `/admin/cms/pages/editor?slug=${encodeURIComponent(slug)}&${q}`;

export async function createBuiltPage(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 4 || title.length > 80) redirect("/admin/cms/pages?pg=title");
  if (CLAIMS_LANGUAGE.test(title)) redirect("/admin/cms/pages?pg=claims");
  const slug = slugify(title);
  const result = await createPage(slug, title);
  if (result === "limit") redirect("/admin/cms/pages?pg=limit");
  if (result === "exists") redirect(editorUrl(slug, "pg=exists"));
  await writeAudit({ actor: await actor(), action: "PAGE_CREATE", target: slug, outcome: "OK" });
  redirect(editorUrl(slug, "pg=created"));
}

export async function editBuiltPage(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const blockId = String(formData.get("blockId") ?? "");
  const page = await findPage(slug);
  if (!page) redirect("/admin/cms/pages");
  const who = await actor();
  const idx = page.blocks.findIndex((b) => b.id === blockId);

  if (intent === "add-block") {
    const type = String(formData.get("type") ?? "richtext") as BlockType;
    if (!BLOCK_META[type]) redirect(editorUrl(slug, "pg=type"));
    if (!canAddBlock(page)) redirect(editorUrl(slug, "pg=blocks"));
    page.blocks.push({ id: newBlockId(), type, props: {} });
    await savePage(page);
    redirect(editorUrl(slug, "pg=added"));
  }

  if (intent === "update-block" && idx >= 0) {
    const block = page.blocks[idx];
    if (block) {
      for (const field of BLOCK_META[block.type].fields) {
        const raw = formData.get(field.key);
        if (raw === null) continue;
        const value = String(raw).replace(/\r\n?/g, "\n").trim().slice(0, field.max);
        // No block on any page may carry a disease claim.
        if (CLAIMS_LANGUAGE.test(value)) {
          await writeAudit({ actor: who, action: "PAGE_BLOCK_SAVE", target: `${slug}#${block.type}`, outcome: "DENIED", note: "claims language" });
          redirect(editorUrl(slug, `pg=claims&b=${blockId}`));
        }
        block.props[field.key] = value;
      }
      await savePage(page);
    }
    redirect(editorUrl(slug, "pg=saved"));
  }

  if ((intent === "move-up" || intent === "move-down") && idx >= 0) {
    const swap = intent === "move-up" ? idx - 1 : idx + 1;
    if (swap >= 0 && swap < page.blocks.length) {
      const a = page.blocks[idx];
      const b = page.blocks[swap];
      if (a && b) {
        page.blocks[idx] = b;
        page.blocks[swap] = a;
        await savePage(page);
      }
    }
    redirect(editorUrl(slug, "pg=moved"));
  }

  if (intent === "delete-block" && idx >= 0) {
    page.blocks.splice(idx, 1);
    await savePage(page);
    redirect(editorUrl(slug, "pg=removed"));
  }

  if (intent === "publish" || intent === "unpublish") {
    page.status = intent === "publish" ? "PUBLISHED" : "DRAFT";
    await savePage(page);
    await writeAudit({ actor: who, action: `PAGE_${intent.toUpperCase()}`, target: slug, outcome: "OK" });
    redirect(editorUrl(slug, `pg=${intent}ed`));
  }

  if (intent === "delete-page") {
    await deletePage(slug);
    await writeAudit({ actor: who, action: "PAGE_DELETE", target: slug, outcome: "OK" });
    redirect("/admin/cms/pages?pg=deleted");
  }

  redirect(editorUrl(slug, "pg=noop"));
}

/* ── Media library ─────────────────────────────────────────────── */

export async function uploadMedia(formData: FormData): Promise<void> {
  const file = formData.get("file");
  const alt = String(formData.get("alt") ?? "").trim().slice(0, 160);
  if (!(file instanceof File) || file.size === 0) redirect("/admin/cms/media?md=file");
  if (!alt) redirect("/admin/cms/media?md=alt"); // accessibility is not optional
  if (file.size > MAX_MEDIA_BYTES) redirect("/admin/cms/media?md=size");
  if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) redirect("/admin/cms/media?md=type");

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;
  const result = await addMedia({ name: file.name.slice(0, 80), alt, dataUrl });
  if (result === "limit") redirect("/admin/cms/media?md=limit");
  await writeAudit({ actor: await actor(), action: "MEDIA_UPLOAD", target: result.id, outcome: "OK", note: file.name.slice(0, 60) });
  redirect(`/admin/cms/media?md=ok&id=${result.id}`);
}

export async function removeMedia(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await deleteMedia(id);
  await writeAudit({ actor: await actor(), action: "MEDIA_DELETE", target: id, outcome: "OK" });
  redirect("/admin/cms/media?md=deleted");
}
