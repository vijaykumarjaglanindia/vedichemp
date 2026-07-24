-- ═══════════════════════════════════════════════════════════════════════
-- VEDIC HEMP — APP SNAPSHOT (durable runtime state)
--
-- One JSON row per in-process store (the globalThis.__vh* seam). The app
-- hydrates these on boot and writes them through on a short interval and on
-- shutdown, so pilot data survives a restart/redeploy on a single instance.
--
-- This table carries NO money or eligibility authority. The compliance tables
-- (AuditLog, LabReport, Settlement, …) and their A1–A6 constraints remain the
-- only source of truth; a forged snapshot cannot bypass a database constraint.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "AppSnapshot" (
  "key"       TEXT PRIMARY KEY,
  "value"     JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The application role reads and writes its own runtime state (this is not a
-- WORM table — snapshots are meant to be overwritten every flush).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vedichemp_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "AppSnapshot" TO vedichemp_app;
  END IF;
END $$;
