/**
 * VEDIC HEMP — §4 IDEMPOTENCY REPLAY WINDOW
 *
 * The constitution requires every money/order POST/PATCH to carry an
 * Idempotency-Key (UUIDv4) with a 24-hour replay window. Validating the header's
 * *shape* (requireIdempotencyKey) is not enough — a retried or double-submitted
 * request with the same key must NOT run the mutation twice. This is the durable
 * replay store behind that guarantee.
 *
 * withIdempotency claims the (scope, key) pair atomically via the composite
 * primary key: the first caller inserts the row and runs the operation; a second
 * caller with the same key inside the window finds the row already there and
 * returns the STORED result instead of moving money again. A key older than the
 * window may be reclaimed (a genuinely new operation happens to reuse a UUID).
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ProhibitionError } from "@/lib/prohibitions";

const WINDOW_MS = 24 * 3600 * 1000;

export interface IdempotentOutcome<T> {
  /** true when this call returned a stored result rather than running fn again. */
  replayed: boolean;
  result: T;
}

/**
 * Run `fn` at most once per (scope, key) within the 24h window. On a replay
 * inside the window the stored result is returned and `fn` never runs; a repeat
 * before the first call has stored its result is rejected as in-progress so two
 * concurrent submissions can never both execute.
 */
export async function withIdempotency<T>(
  scope: string,
  key: string,
  fn: () => Promise<T>,
): Promise<IdempotentOutcome<T>> {
  // Try to CLAIM the key. The composite PK makes this atomic: exactly one
  // concurrent caller wins the insert; the rest get a unique-violation.
  try {
    await db.idempotencyKey.create({ data: { scope, key } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await db.idempotencyKey.findUnique({ where: { scope_key: { scope, key } } });
      const fresh = existing && Date.now() - existing.createdAt.getTime() < WINDOW_MS;
      if (fresh) {
        if (existing!.resultJson !== null && existing!.resultJson !== undefined) {
          // A completed prior request with the same key — replay its result.
          return { replayed: true, result: existing!.resultJson as T };
        }
        // The first request is still running: refuse rather than double-execute.
        throw new ProhibitionError(
          "IDEMPOTENCY_IN_PROGRESS",
          "A request with this Idempotency-Key is already being processed. Retry shortly.",
        );
      }
      // Outside the window — reclaim the stale key for this new operation.
      await db.idempotencyKey.update({
        where: { scope_key: { scope, key } },
        data: { createdAt: new Date(), resultJson: Prisma.DbNull },
      });
    } else {
      throw err;
    }
  }

  // We hold the claim. Run the operation, then store its result so a later
  // replay returns it. If fn throws, release the claim so the caller can retry.
  let result: T;
  try {
    result = await fn();
  } catch (err) {
    await db.idempotencyKey.delete({ where: { scope_key: { scope, key } } }).catch(() => {});
    throw err;
  }
  await db.idempotencyKey.update({
    where: { scope_key: { scope, key } },
    data: { resultJson: (result ?? Prisma.JsonNull) as Prisma.InputJsonValue },
  });
  return { replayed: false, result };
}
