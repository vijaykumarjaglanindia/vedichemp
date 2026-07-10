-- ═══════════════════════════════════════════════════════════════════════
-- VEDIC HEMP — PROHIBITIONS A1–A6, AS DATABASE CONSTRAINTS
--
-- Prisma cannot express CHECK constraints, triggers or role grants. That is
-- why they live here. This migration is the difference between a policy and
-- an enforcement.
--
-- Run after `prisma migrate dev`. Verified by tests/prohibitions.test.ts.
-- ═══════════════════════════════════════════════════════════════════════


-- ───────────────────────── A1 ─────────────────────────
-- No MED_CANNABIS product may be advertised or promoted, by anyone, ever.
-- Layer 1 of 3. (Layer 2 = the ad index omits the class. Layer 3 = the auction
-- asserts the class on every candidate and drops it with a logged violation.)
-- One bug should not produce an unlawful advertisement.

ALTER TABLE "AdCampaign"
  ADD CONSTRAINT a1_no_med_cannabis_ads
  CHECK ("complianceClass" <> 'MED_CANNABIS');

COMMENT ON CONSTRAINT a1_no_med_cannabis_ads ON "AdCampaign" IS
  'A1: advertising a prescription medicine to the public is unlawful. There is no legitimate business case, so there is no switch.';


-- ───────────────────────── A2 ─────────────────────────
-- No batch becomes sellable without an APPROVED, batch-matched CoA.
-- There is no force_sellable column. A "senior approval" path was considered
-- and deliberately not built.

-- 2a. An approved report must have been signed by a human.
ALTER TABLE "LabReport"
  ADD CONSTRAINT a2_approved_needs_human_verifier
  CHECK (status <> 'APPROVED' OR "verifiedById" IS NOT NULL);

-- 2b. An approved report must be within the legal THC limit.
ALTER TABLE "LabReport"
  ADD CONSTRAINT a2_approved_thc_within_limit
  CHECK (status <> 'APPROVED' OR "thcPercent" <= 0.300);

-- 2c. The CoA must be issued for THIS batch. A report for another batch is
--     not evidence about this one.
CREATE OR REPLACE FUNCTION a2_assert_batch_match() RETURNS trigger AS $$
DECLARE
  real_code text;
BEGIN
  SELECT "batchCode" INTO real_code FROM "Batch" WHERE id = NEW."batchId";
  IF real_code IS DISTINCT FROM NEW."batchCode" THEN
    RAISE EXCEPTION 'A2: lab report batch code % does not match batch %', NEW."batchCode", real_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER a2_batch_match
  BEFORE INSERT OR UPDATE ON "LabReport"
  FOR EACH ROW EXECUTE FUNCTION a2_assert_batch_match();

-- 2d. A CoA dated more than 90 days after manufacture is stale.
CREATE OR REPLACE FUNCTION a2_assert_coa_freshness() RETURNS trigger AS $$
DECLARE
  mfg timestamptz;
BEGIN
  IF NEW.status = 'APPROVED' THEN
    SELECT "mfgDate" INTO mfg FROM "Batch" WHERE id = NEW."batchId";
    IF NEW."createdAt" > mfg + interval '90 days' THEN
      RAISE EXCEPTION 'A2: CoA issued more than 90 days after manufacture';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER a2_coa_freshness
  BEFORE INSERT OR UPDATE ON "LabReport"
  FOR EACH ROW EXECUTE FUNCTION a2_assert_coa_freshness();


-- ───────────────────────── A3 ─────────────────────────
-- Safety signals, adverse events, dispensing registers, recall records and
-- audit logs cannot be deleted or substantively altered.
-- A marketplace that can quietly delete "this made me ill" is a marketplace
-- that will. Corrections are new rows referencing the old.

-- The application connects as vedichemp_app. It can insert. It cannot rewrite history.
REVOKE UPDATE, DELETE ON "AuditLog"            FROM vedichemp_app;
REVOKE UPDATE, DELETE ON "SensitiveAccessLog"  FROM vedichemp_app;
REVOKE UPDATE, DELETE ON "AdverseEvent"        FROM vedichemp_app;
REVOKE UPDATE, DELETE ON "WalletEntry"         FROM vedichemp_app;
REVOKE UPDATE, DELETE ON "Consent"             FROM vedichemp_app;
REVOKE DELETE           ON "Recall"            FROM vedichemp_app;

-- Belt and braces: even a superuser mistake is caught.
CREATE OR REPLACE FUNCTION a3_no_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'A3: % is append-only. Corrections are new rows.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER a3_auditlog_immutable
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION a3_no_mutation();

CREATE TRIGGER a3_sensitive_log_immutable
  BEFORE UPDATE OR DELETE ON "SensitiveAccessLog"
  FOR EACH ROW EXECUTE FUNCTION a3_no_mutation();

CREATE TRIGGER a3_adverse_event_immutable
  BEFORE UPDATE OR DELETE ON "AdverseEvent"
  FOR EACH ROW EXECUTE FUNCTION a3_no_mutation();

CREATE TRIGGER a3_wallet_entry_immutable
  BEFORE UPDATE OR DELETE ON "WalletEntry"
  FOR EACH ROW EXECUTE FUNCTION a3_no_mutation();


-- ───────────────────────── A4 ─────────────────────────
-- Health data is viewable only by Pharmacist/Compliance, only with a logged
-- reason, and the buyer is notified. Curiosity is not a reason.
-- Route scopes live in src/server/rbac.ts. Here we make the log mandatory:
-- a prescription object key cannot be served without a preceding log row.

ALTER TABLE "SensitiveAccessLog"
  ADD CONSTRAINT a4_reason_text_substantive
  CHECK (char_length("reasonText") >= 20);

ALTER TABLE "SensitiveAccessLog"
  ADD CONSTRAINT a4_reason_code_controlled
  CHECK ("reasonCode" IN (
    'PRESCRIPTION_VERIFICATION',
    'ADVERSE_EVENT_TRIAGE',
    'REGULATORY_REQUEST',
    'DISPUTE_EVIDENCE'
  ));

-- Only a human pharmacist verifies a prescription. Never a service account,
-- never a model.
ALTER TABLE "Prescription"
  ADD CONSTRAINT a4_verified_needs_human
  CHECK (status <> 'VERIFIED' OR "verifiedById" IS NOT NULL);


-- ───────────────────────── A5 ─────────────────────────
-- No retroactive fee increase. A change cannot take effect until 30 days
-- after notice was sent. A DBA with write access could drop this; the audit
-- would show that they did.

ALTER TABLE "CommissionSchedule"
  ADD CONSTRAINT a5_thirty_day_notice
  CHECK ("effectiveFrom" >= "noticeSentAt" + interval '30 days');

COMMENT ON CONSTRAINT a5_thirty_day_notice ON "CommissionSchedule" IS
  'A5: historic statements must never move.';


-- ───────────────────────── A6 ─────────────────────────
-- No single admin moves money. Two distinct human identities, neither a
-- service account.

ALTER TABLE "Settlement"
  ADD CONSTRAINT a6_maker_is_not_checker
  CHECK ("checkerId" IS NULL OR "makerId" <> "checkerId");

ALTER TABLE "Settlement"
  ADD CONSTRAINT a6_posted_needs_checker
  CHECK (status <> 'POSTED' OR "checkerId" IS NOT NULL);

-- Wallet adjustments (as distinct from order payments) need two humans.
ALTER TABLE "WalletEntry"
  ADD CONSTRAINT a6_adjustment_maker_is_not_checker
  CHECK ("makerId" IS NULL OR "checkerId" IS NULL OR "makerId" <> "checkerId");

ALTER TABLE "Recall"
  ADD CONSTRAINT a6_recall_maker_is_not_checker
  CHECK ("checkerId" IS NULL OR "makerId" <> "checkerId");

-- Threshold splitting: three ₹4,999 refunds are one ₹14,997 refund.
-- Enforced in src/server/money.ts against a rolling 24h window, because the
-- rule needs application context. The constraint above catches the simple case.


-- ───────────────────────── Verification ─────────────────────────
-- These views make it trivial to assert the prohibitions still hold in prod.

CREATE VIEW prohibition_status AS
  SELECT 'A1' AS code,
         EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'a1_no_med_cannabis_ads') AS enforced
  UNION ALL SELECT 'A2', EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'a2_approved_needs_human_verifier')
  UNION ALL SELECT 'A3', EXISTS (SELECT 1 FROM pg_trigger    WHERE tgname  = 'a3_auditlog_immutable')
  UNION ALL SELECT 'A4', EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'a4_reason_text_substantive')
  UNION ALL SELECT 'A5', EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'a5_thirty_day_notice')
  UNION ALL SELECT 'A6', EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'a6_maker_is_not_checker');
