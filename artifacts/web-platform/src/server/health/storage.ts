/**
 * VEDIC HEMP — SENSITIVE OBJECT STORAGE (A4 / NFR-07)
 *
 * Prescriptions and medical notes live in a bucket with object lock, encrypted
 * with a *separate* KMS CMK. They are never served by a public URL. A caller
 * receives a signed URL with a 5-minute TTL, and only after an access log row
 * exists (see assertSensitiveAccess).
 *
 * This module is the seam where the real S3 presigner is wired in. It is a
 * function, not an inline call, so that "issue a signed URL" always goes
 * through the same 5-minute-TTL, audited path.
 */

const SIGNED_URL_TTL_SECONDS = 5 * 60;

export interface SignedUrl {
  url: string;
  expiresAt: Date;
  ttlSeconds: number;
}

/**
 * In production this calls the S3 presigner against the sensitive bucket. Here
 * it returns a deterministic, obviously-non-public placeholder so the flow is
 * exercisable end to end without leaking a real object.
 */
export async function signSensitiveObject(objectKey: string): Promise<SignedUrl> {
  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000);
  const url = `https://sensitive.vedichemp.in/${encodeURIComponent(objectKey)}?X-Amz-Expires=${SIGNED_URL_TTL_SECONDS}&X-Amz-Signature=REDACTED`;
  return { url, expiresAt, ttlSeconds: SIGNED_URL_TTL_SECONDS };
}
