/**
 * VEDIC HEMP — ROUTE HANDLER HELPERS
 *
 * Route handlers are thin: they validate input, call a service, and return. The
 * business rule never lives in the handler. This module maps a thrown
 * ProhibitionError to the platform error envelope (§0.7) — a stable code, a
 * human message, and, crucially, a remediation the UI can act on. A bare 403 is
 * not acceptable; the error tells the user what to do next.
 */

import { NextResponse } from "next/server";
import { ProhibitionError } from "@/lib/prohibitions";

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    field: string | null;
    trace_id: string;
    retryable: boolean;
    remediation: { label: string; href: string } | null;
  };
}

export function errorResponse(err: unknown, status = 400): NextResponse<ErrorEnvelope> {
  const trace_id = crypto.randomUUID();
  if (err instanceof ProhibitionError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          field: null,
          trace_id,
          retryable: false,
          remediation: err.remediation ?? null,
        },
      },
      { status }
    );
  }
  const message = err instanceof Error ? err.message : "Unexpected error.";
  return NextResponse.json(
    { error: { code: "INTERNAL", message, field: null, trace_id, retryable: true, remediation: null } },
    { status: 500 }
  );
}

/** Every money/order mutation requires an Idempotency-Key (UUIDv4) — §0.6 V-G-08. */
export function requireIdempotencyKey(req: Request): string {
  const key = req.headers.get("Idempotency-Key");
  if (!key || !/^[0-9a-f-]{36}$/i.test(key)) {
    throw new ProhibitionError("IDEMPOTENCY_KEY_REQUIRED", "This action requires an Idempotency-Key header (UUIDv4).");
  }
  return key;
}
