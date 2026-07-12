"use server";

/**
 * VEDIC HEMP — PRESCRIPTION ACTIONS (A4 surface)
 *
 * Upload stores METADATA only in demo mode — the file itself is discarded
 * here and, in production, goes straight to the sensitive bucket (separate
 * KMS key, object lock) via src/server/health/storage.ts. Viewing issues a
 * short-lived signed link and writes an access-log entry; even self-access
 * is logged, because the log is the product (A4).
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const OPTS = { path: "/", httpOnly: true, sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 90 };
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 10 * 1024 * 1024;

export interface RxUpload {
  id: string;
  fileName: string;
  uploadedAt: string;
  status: string; // UNDER_REVIEW
}

export async function uploadPrescription(formData: FormData): Promise<void> {
  const file = formData.get("rx");
  if (!(file instanceof File) || file.size === 0) redirect("/account/medical?err=file#upload");
  if (!ACCEPTED.includes(file.type)) redirect("/account/medical?err=type#upload");
  if (file.size > MAX_BYTES) redirect("/account/medical?err=size#upload");

  const jar = await cookies();
  let uploads: RxUpload[] = [];
  try { uploads = JSON.parse(jar.get("vh-rx")?.value ?? "[]") as RxUpload[]; } catch { uploads = []; }
  const id = `rxu-${Date.now().toString(36)}`;
  uploads.unshift({
    id,
    // Metadata only — never the document. Truncated defensively.
    fileName: file.name.slice(0, 60),
    uploadedAt: new Date().toISOString().slice(0, 10),
    status: "UNDER_REVIEW",
  });
  jar.set("vh-rx", JSON.stringify(uploads.slice(0, 4)), OPTS);
  redirect("/account/medical?uploaded=1#upload");
}

export async function requestRxViewLink(formData: FormData): Promise<void> {
  const rxId = String(formData.get("rxId") ?? "").slice(0, 20);
  // Production: presign a 5-minute URL against the sensitive bucket AND write
  // a SensitiveAccessLog row (actor = the buyer themself, reasonCode =
  // SELF_ACCESS). Self-access is logged too — the log is append-only (A3/A4).
  redirect(`/account/medical?viewlink=${encodeURIComponent(rxId)}`);
}
