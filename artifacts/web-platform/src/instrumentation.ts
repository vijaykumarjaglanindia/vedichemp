/**
 * VEDIC HEMP — server startup hook (Next.js instrumentation).
 *
 * Runs once when the server process boots, before it serves traffic. It makes
 * the in-process stores durable: hydrate saved snapshots first (so no store
 * re-seeds over persisted data), then keep them flushed on a short interval and
 * once more on shutdown. Node runtime only — the Edge runtime has no DB client
 * and no process signals.
 *
 * See src/lib/persist.ts for the durability contract and its single-instance
 * assumption.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { hydrateAll, startAutoFlush, stopAndFlush, persistenceEnabled } = await import("@/lib/persist");
  if (!persistenceEnabled()) return;

  try {
    await hydrateAll();
    startAutoFlush();

    // Persist the last few seconds of writes before the process exits (a
    // redeploy sends SIGTERM). Registered once; guarded against double-fire.
    let shuttingDown = false;
    const onSignal = (signal: NodeJS.Signals) => {
      if (shuttingDown) return;
      shuttingDown = true;
      void stopAndFlush().finally(() => process.exit(0));
      // Backstop: never hang the platform on a slow flush.
      setTimeout(() => process.exit(0), 4000).unref();
      void signal;
    };
    process.once("SIGTERM", onSignal);
    process.once("SIGINT", onSignal);
  } catch (err) {
    // Durability is best-effort: a snapshot failure must never stop the app
    // from booting and serving patients their own data (fail open on convenience).
    console.error("[instrumentation] persistence init failed:", err);
  }
}
