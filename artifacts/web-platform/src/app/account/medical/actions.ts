"use server";

/**
 * VEDIC HEMP — PRESCRIPTION ACTIONS (A4 surface)
 *
 * Upload stores METADATA only — the file bytes are discarded here and, in
 * production, go straight to the sensitive bucket (separate KMS key, object
 * lock) via src/server/health/storage.ts. The metadata row lands in the live
 * prescription store as PENDING_REVIEW, so the same upload the buyer sees is
 * the one that appears in the pharmacist's verification queue. There is no
 * self-serve activation — a human pharmacist flips the status.
 *
 * Viewing your OWN prescription is a right (§2 fail-open): it issues a
 * short-lived signed link and writes an append-only access-log row (actor =
 * you, reason = SELF_ACCESS) — the log is the product, so even self-access is
 * recorded. Ownership is enforced server-side; a foreign id is denied (and the
 * denial is logged too).
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-lite";
import { uploadPrescription as storeUpload, selfAccessPrescription } from "@/lib/prescriptions";

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 10 * 1024 * 1024;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function uploadPrescription(formData: FormData): Promise<void> {
  const session = await getSession();
  const email = session?.email;
  if (!email) redirect("/signin?next=/account/medical");

  const file = formData.get("rx");
  if (!(file instanceof File) || file.size === 0) redirect("/account/medical?err=file#upload");
  if (!ACCEPTED.includes(file.type)) redirect("/account/medical?err=type#upload");
  if (file.size > MAX_BYTES) redirect("/account/medical?err=size#upload");

  // Metadata the pharmacist verifies AGAINST the image — collected from the
  // buyer, validated server-side. The client cannot skip these by tampering.
  const doctor = String(formData.get("doctor") ?? "").trim().slice(0, 120);
  const regNo = String(formData.get("regNo") ?? "").trim().slice(0, 40);
  const issuedAt = String(formData.get("issuedAt") ?? "").trim();
  const validTill = String(formData.get("validTill") ?? "").trim();
  if (doctor.length < 3 || regNo.length < 3) redirect("/account/medical?err=meta#upload");
  if (!DATE_RE.test(issuedAt) || !DATE_RE.test(validTill)) redirect("/account/medical?err=dates#upload");
  if (validTill <= issuedAt) redirect("/account/medical?err=window#upload");

  await storeUpload({
    buyerEmail: email,
    buyerName: session?.name || email.split("@")[0] || email,
    doctor,
    regNo,
    issuedAt,
    validTill,
    // A KEY into the sensitive bucket — never the bytes, never the file name in
    // a way that could leak health context. Defensively derived, not trusted.
    fileRef: `rx/${email.split("@")[0]}-${Date.now().toString(36)}`,
  });

  redirect("/account/medical?uploaded=1#upload");
}

export async function requestRxViewLink(formData: FormData): Promise<void> {
  const session = await getSession();
  const email = session?.email;
  if (!email) redirect("/signin?next=/account/medical");

  const rxId = String(formData.get("rxId") ?? "").slice(0, 20);
  // Ownership + logging live in the store. A buyer can only ever reach their
  // own record; a foreign id is denied server-side.
  const result = await selfAccessPrescription({ prescriptionId: rxId, buyerEmail: email! });
  if (!result.ok) redirect("/account/medical?err=view");
  redirect(`/account/medical?viewlink=${encodeURIComponent(rxId)}`);
}
