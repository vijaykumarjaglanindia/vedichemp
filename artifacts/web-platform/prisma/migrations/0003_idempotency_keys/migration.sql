-- VEDIC HEMP — §4 IDEMPOTENCY REPLAY WINDOW
--
-- Every money/order POST/PATCH carries an Idempotency-Key (UUIDv4). This table
-- is the 24h replay window the constitution requires: a key is claimed once per
-- operation scope (composite PK), so a retried or double-submitted request finds
-- the key already present and returns the stored result instead of moving money
-- a second time. The application layer (src/server/idempotency.ts) owns the
-- claim/replay/reclaim logic; this is just its durable store.
CREATE TABLE IF NOT EXISTS "IdempotencyKey" (
  "scope"      TEXT        NOT NULL,
  "key"        TEXT        NOT NULL,
  "resultJson" JSONB,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("scope", "key")
);

CREATE INDEX IF NOT EXISTS "IdempotencyKey_createdAt_idx" ON "IdempotencyKey" ("createdAt");
