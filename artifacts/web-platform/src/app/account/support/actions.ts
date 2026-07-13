"use server";

/**
 * VEDIC HEMP — SUPPORT TICKET ACTION
 *
 * Server-side validation, server-issued ticket reference. Prescription/medical
 * topics are tagged so routing sends them to Pharmacist/Compliance only (A4) —
 * a support agent never sees the Rx image without a logged reason.
 */

import { redirect } from "next/navigation";
import { appendTicket } from "@/lib/engage";

const TOPICS = ["Order issue", "Wallet / refund", "Prescription / Medical", "Account & security", "Something else"];

export async function createTicket(formData: FormData): Promise<void> {
  const topic = String(formData.get("topic") ?? "");
  const orderRef = String(formData.get("orderref") ?? "").trim().slice(0, 20);
  const desc = String(formData.get("desc") ?? "").trim();

  if (!TOPICS.includes(topic)) redirect("/account/support?err=topic");
  if (desc.length < 20 || desc.length > 1000) redirect("/account/support?err=desc");
  if (orderRef && !/^VH[0-9]{8,14}$/i.test(orderRef)) redirect("/account/support?err=orderref");

  const id = `TK${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const subject = orderRef
    ? `${topic} · ${orderRef.toUpperCase()}`
    : `${topic} · ${desc.slice(0, 40)}${desc.length > 40 ? "…" : ""}`;
  await appendTicket({
    id,
    subject,
    category: topic === "Prescription / Medical" ? "Medical" : topic,
    status: "OPEN",
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  redirect(`/account/support?ok=${id}`);
}
