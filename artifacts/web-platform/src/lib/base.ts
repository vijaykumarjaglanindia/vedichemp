import "server-only";

/**
 * VEDIC HEMP — BASE PATH HELPER
 *
 * For the few href targets that must stay plain <a> tags (file downloads
 * from route handlers), where next/link would try to client-navigate.
 * next/link and redirect() handle the prefix themselves — use them for
 * everything else.
 */

export function withBase(path: string): string {
  const bp = (process.env.BASE_PATH ?? "").replace(/\/$/, "");
  return `${bp}${path}`;
}
