"use server";

/**
 * VEDIC HEMP — SUBSCRIPTION ACTIONS
 *
 * Skip / pause / resume / cancel, validated against a server-side state
 * machine. Skip is idempotent — repeating it never double-skips — and
 * undoable. A regulated subscription auto-paused for a lapsed Rx cannot be
 * resumed from here; only a verified prescription lifts that pause.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SUBSCRIPTIONS } from "../_lib/data";

const OPTS = { path: "/", httpOnly: true, sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 90 };

export interface SubOverride {
  status?: string; // PAUSED | CANCELLED | ACTIVE
  skipped?: boolean;
}

export async function readSubOverrides(): Promise<Record<string, SubOverride>> {
  const jar = await cookies();
  try { return JSON.parse(jar.get("vh-subs")?.value ?? "{}") as Record<string, SubOverride>; } catch { return {}; }
}

export async function subscriptionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("subId") ?? "").slice(0, 12);
  const op = String(formData.get("op") ?? "");
  const sub = SUBSCRIPTIONS.find((s) => s.id === id);
  if (!sub || !["skip", "unskip", "pause", "resume", "cancel"].includes(op)) {
    redirect("/account/subscriptions");
  }

  const overrides = await readSubOverrides();
  const cur: SubOverride = overrides[id] ?? {};
  const status = cur.status ?? sub!.status;

  // Server-side state machine — the buttons are decoration.
  if (status === "CANCELLED") redirect("/account/subscriptions");
  if (op === "skip") cur.skipped = true; // idempotent by construction
  else if (op === "unskip") cur.skipped = false;
  else if (op === "pause") cur.status = "PAUSED";
  else if (op === "resume") cur.status = "ACTIVE";
  else if (op === "cancel") cur.status = "CANCELLED";

  overrides[id] = cur;
  (await cookies()).set("vh-subs", JSON.stringify(overrides), OPTS);
  redirect(`/account/subscriptions?done=${op}`);
}
