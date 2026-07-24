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

import { createHash, createHmac } from "node:crypto";
import { envSet } from "@/lib/integrations";

const SIGNED_URL_TTL_SECONDS = 5 * 60;

export interface SignedUrl {
  url: string;
  expiresAt: Date;
  ttlSeconds: number;
  live: boolean; // true = a real presigned S3 URL; false = the sandbox placeholder
}

/** True when a real S3-compatible sensitive bucket is configured. */
export function sensitiveStorageLive(): boolean {
  return envSet("S3_REGION") && envSet("S3_ACCESS_KEY_ID") && envSet("S3_SECRET_ACCESS_KEY") && envSet("SENSITIVE_BUCKET");
}

// RFC-3986 encoding for each path segment (AWS SigV4 requires this, not the
// looser encodeURIComponent default).
function rfc3986(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}
function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}
function sha256hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * Presign an S3 GET as a query-string AWS SigV4 URL — no SDK, no dependency.
 * `now` is injectable so the signature is deterministic in a test.
 */
export function presignS3Get(objectKey: string, now: Date = new Date()): { url: string; expiresAt: Date } {
  const region = process.env.S3_REGION!;
  const accessKey = process.env.S3_ACCESS_KEY_ID!;
  const secretKey = process.env.S3_SECRET_ACCESS_KEY!;
  const bucket = process.env.SENSITIVE_BUCKET!;
  const endpoint = process.env.S3_ENDPOINT; // set for non-AWS (MinIO, Wasabi…)

  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);

  // Virtual-hosted style on AWS; path-style on a custom endpoint.
  let host: string;
  let canonicalUri: string;
  if (endpoint) {
    const u = new URL(endpoint);
    host = u.host;
    canonicalUri = `/${bucket}/${objectKey.split("/").map(rfc3986).join("/")}`;
  } else {
    host = `${bucket}.s3.${region}.amazonaws.com`;
    canonicalUri = `/${objectKey.split("/").map(rfc3986).join("/")}`;
  }

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const params: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKey}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(SIGNED_URL_TTL_SECONDS),
    "X-Amz-SignedHeaders": "host",
  };
  const canonicalQuery = Object.keys(params).sort().map((k) => `${rfc3986(k)}=${rfc3986(params[k]!)}`).join("&");
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = ["GET", canonicalUri, canonicalQuery, canonicalHeaders, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256hex(canonicalRequest)].join("\n");

  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

  const scheme = endpoint ? new URL(endpoint).protocol.replace(":", "") : "https";
  const url = `${scheme}://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  return { url, expiresAt: new Date(now.getTime() + SIGNED_URL_TTL_SECONDS * 1000) };
}

/**
 * Issue a short-lived signed URL for a sensitive object. With a real bucket
 * configured this is a genuine SigV4 presigned GET (5-min TTL); without one it
 * returns a deterministic, obviously-non-public placeholder so the reason-gated
 * flow is exercisable end to end without leaking a real object.
 */
export async function signSensitiveObject(objectKey: string): Promise<SignedUrl> {
  if (sensitiveStorageLive()) {
    const { url, expiresAt } = presignS3Get(objectKey);
    return { url, expiresAt, ttlSeconds: SIGNED_URL_TTL_SECONDS, live: true };
  }
  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000);
  const url = `https://sensitive.vedichemp.in/${encodeURIComponent(objectKey)}?X-Amz-Expires=${SIGNED_URL_TTL_SECONDS}&X-Amz-Signature=REDACTED`;
  return { url, expiresAt, ttlSeconds: SIGNED_URL_TTL_SECONDS, live: false };
}
