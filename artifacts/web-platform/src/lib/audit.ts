/**
 * VEDIC HEMP — AUDIT TRAIL (server-side store; DB seam → AuditLog table)
 *
 * Every mutating admin action writes here synchronously, BEFORE returning —
 * losing the log is worse than failing the action. Denied attempts are logged
 * too: what someone tried to do is often more informative than what they did.
 * Entries are append-only; there is no delete or update helper on purpose
 * (A3 — in production this is a REVOKE at the DB role level).
 */

export interface AuditEntry {
  at: string; // ISO timestamp
  actor: string; // admin email
  action: string; // e.g. SITE_CONTENT_SAVE, RECALL_CLOSE
  target: string; // what it acted on
  outcome: "OK" | "DENIED";
  note?: string; // reason text / denial cause — never health data
}

declare global {
  // eslint-disable-next-line no-var
  var __vhAuditLog: AuditEntry[] | undefined;
}

function store(): AuditEntry[] {
  globalThis.__vhAuditLog ??= [];
  return globalThis.__vhAuditLog;
}

export async function writeAudit(entry: Omit<AuditEntry, "at">): Promise<void> {
  store().unshift({ ...entry, at: new Date().toISOString() });
}

export async function readAudit(limit = 100): Promise<AuditEntry[]> {
  return store().slice(0, limit);
}
