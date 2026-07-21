-- VEDIC HEMP — A3 CLOSE-OUT: RECALL RECORDS ARE UNDELETABLE
--
-- A3 lists "recall records" alongside audit logs and adverse events as things
-- that "cannot be deleted or altered". Migration 0001 gave AuditLog,
-- SensitiveAccessLog, AdverseEvent and WalletEntry BOTH a role-level
-- `REVOKE UPDATE, DELETE` AND a `BEFORE UPDATE OR DELETE` trigger (a3_no_mutation)
-- so that even a superuser or a misconfigured role cannot erase them.
--
-- Recall received only `REVOKE DELETE FROM vedichemp_app` — a role grant a
-- superuser bypasses. And a Recall is legitimately UPDATEd once (the checker
-- closes it), so it cannot carry the full BEFORE UPDATE OR DELETE trigger the
-- fully-immutable tables use. The right belt-and-braces is a DELETE-only trigger:
-- the close transition still works, but no one — app role, DBA or superuser —
-- can delete a recall record. A correction is a new recall row, never an erase.
--
-- Idempotent: safe to re-apply (DROP IF EXISTS then CREATE), matching how the
-- prohibition SQL is applied by `pnpm db:prohibitions`.

DROP TRIGGER IF EXISTS a3_recall_no_delete ON "Recall";

CREATE TRIGGER a3_recall_no_delete
  BEFORE DELETE ON "Recall"
  FOR EACH ROW EXECUTE FUNCTION a3_no_mutation();

COMMENT ON TRIGGER a3_recall_no_delete ON "Recall" IS
  'A3: recall records are append-only. Closing a recall is an UPDATE (allowed); deleting one is not, for anyone.';

-- A3 "cannot be altered" for a CLOSED recall. A Recall is UPDATEd exactly once —
-- the checker closes it. After that it is history and must never be rewritten
-- (re-closed, re-attributed, reason edited). A BEFORE UPDATE trigger that raises
-- only when the row is ALREADY closed allows the single close (OLD.closedAt IS
-- NULL) but rejects any later mutation, for anyone — the app role's atomic
-- `WHERE closedAt IS NULL` write handles the concurrent race; this is the
-- belt-and-braces backstop against a bug or a direct query touching a closed row.
CREATE OR REPLACE FUNCTION a3_recall_closed_immutable() RETURNS trigger AS $$
BEGIN
  IF OLD."closedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'A3: a closed recall is append-only and cannot be altered. A change is a new recall row.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS a3_recall_no_reclose ON "Recall";

CREATE TRIGGER a3_recall_no_reclose
  BEFORE UPDATE ON "Recall"
  FOR EACH ROW EXECUTE FUNCTION a3_recall_closed_immutable();

COMMENT ON TRIGGER a3_recall_no_reclose ON "Recall" IS
  'A3: a recall may be UPDATEd once (the close). An already-closed recall is immutable — no re-close, no re-attribution, for anyone.';
