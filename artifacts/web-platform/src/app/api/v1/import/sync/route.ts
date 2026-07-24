/**
 * POST /api/v1/import/sync — run every connected store whose sync cadence is due.
 *
 * This is the seam a real scheduler (cron, queue worker) calls on an interval;
 * it runs exactly the due stores and no more. It is dual-gated and fails closed:
 * either an ADMIN session, or a bearer token matching IMPORT_SYNC_SECRET (for a
 * headless cron that has no session). With neither, it is 401 — never open.
 *
 * A sync cannot publish anything: new products land DRAFT, regulated products
 * stay behind the CoA gate (A2), and Medical Cannabis is refused (A1). The
 * orchestrator audits each run.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-lite";
import { runDueSyncs } from "@/lib/import/service";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1]!.trim() : null;
}

export async function POST(req: Request) {
  const session = await getSession();
  const isAdmin = session?.role === "ADMIN";

  const secret = process.env.IMPORT_SYNC_SECRET;
  const token = bearer(req);
  // A configured secret matched by the caller authorizes a headless cron.
  const hasValidSecret = !!secret && !!token && token === secret;

  if (!isAdmin && !hasValidSecret) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sync requires an admin session or a valid sync token.", field: null, trace_id: crypto.randomUUID(), retryable: false, remediation: { label: "Sign in", href: "/signin" } } },
      { status: 401 },
    );
  }

  const actor = isAdmin ? (session?.email ?? "admin") : "scheduler@cron";
  const summaries = await runDueSyncs(actor);

  const totals = summaries.reduce(
    (a, s) => ({
      imported: a.imported + s.imported,
      updated: a.updated + s.updated,
      skipped: a.skipped + s.skipped,
      failed: a.failed + s.failed,
      gatedRegulated: a.gatedRegulated + s.gatedRegulated,
      blockedMedical: a.blockedMedical + s.blockedMedical,
    }),
    { imported: 0, updated: 0, skipped: 0, failed: 0, gatedRegulated: 0, blockedMedical: 0 },
  );

  return NextResponse.json({ data: { storesSynced: summaries.length, ...totals } });
}
