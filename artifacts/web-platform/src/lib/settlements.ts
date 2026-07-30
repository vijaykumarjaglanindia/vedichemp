import "server-only";

/**
 * VEDIC HEMP — SELLER SETTLEMENTS (A6 maker–checker, A3 immutable)
 *
 * A settlement run gathers a seller's delivered-order earnings for a period
 * into one net-payable statement. Creating a run is the MAKER's act; POSTING
 * it (which is what actually moves money to the payout pipeline) is the
 * CHECKER's — and the checker can never be the maker (A6). Once posted, a
 * statement is immutable (A3): there is no edit or delete here at all — a
 * correction would be a new run referencing the old.
 *
 * Store = the DB seam (`SettlementRun` table). Amounts are integer paise,
 * derived from the earnings lines — never typed in by an admin.
 */

import { earningLines } from "@/lib/earnings";

export type SettlementStatus = "AWAITING_CHECKER" | "POSTED";

export interface SettlementRun {
  id: string;
  seller: string;
  period: string; // human label, e.g. "1–15 Jul 2026"
  grossPaise: number;
  commissionPaise: number;
  netPaise: number;
  status: SettlementStatus;
  maker: string;
  checker?: string;
  createdAt: string;
  postedAt?: string;
  orderRefs: string[]; // the delivered orders this run settles
}

interface SettlementStore {
  runs: SettlementRun[];
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhSettlements: SettlementStore | undefined;
}

// A settlement run is a money record: it exists only because createRun()
// gathered real earnings lines and a checker posted it. There is no seed.
function store(): SettlementStore {
  globalThis.__vhSettlements ??= { runs: [], seq: 1 };
  return globalThis.__vhSettlements;
}

const today = () => new Date().toISOString().slice(0, 10);

export async function allRuns(): Promise<SettlementRun[]> {
  return [...store().runs].sort((a, b) => {
    if ((a.status === "AWAITING_CHECKER") !== (b.status === "AWAITING_CHECKER")) return a.status === "AWAITING_CHECKER" ? -1 : 1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

export async function runsForSeller(seller: string): Promise<SettlementRun[]> {
  return (await allRuns()).filter((r) => r.seller === seller);
}

export function findRun(id: string): SettlementRun | undefined {
  return store().runs.find((r) => r.id === id);
}

export type RunResult = { ok: true; run: SettlementRun } | { ok: false; reason: string };

/**
 * MAKER: create a run for a seller's un-settled delivered orders. Amounts are
 * DERIVED from the earnings lines — an admin cannot type a number in. Refuses
 * when a run is already awaiting its checker, or there is nothing to settle.
 */
export async function createRun(seller: string, maker: string): Promise<RunResult> {
  const s = store();
  if (s.runs.some((r) => r.seller === seller && r.status === "AWAITING_CHECKER")) {
    return { ok: false, reason: "pending" };
  }
  const settledRefs = new Set(s.runs.flatMap((r) => r.orderRefs));
  const lines = (await earningLines(seller)).filter((l) => !settledRefs.has(l.reference));
  if (lines.length === 0) return { ok: false, reason: "empty" };
  const grossPaise = lines.reduce((n, l) => n + l.grossPaise, 0);
  const commissionPaise = lines.reduce((n, l) => n + l.commissionPaise, 0);
  const run: SettlementRun = {
    id: `st${s.seq++}`,
    seller,
    period: `to ${today()}`,
    grossPaise,
    commissionPaise,
    netPaise: grossPaise - commissionPaise,
    status: "AWAITING_CHECKER",
    maker,
    createdAt: today(),
    orderRefs: lines.map((l) => l.reference),
  };
  s.runs.unshift(run);
  return { ok: true, run };
}

/** CHECKER: post an awaiting run. A6 — the checker can never be the maker.
 *  Once posted the run is immutable; nothing here can change it again. */
export async function postRun(id: string, checker: string): Promise<RunResult> {
  const r = findRun(id);
  if (!r) return { ok: false, reason: "missing" };
  if (r.status !== "AWAITING_CHECKER") return { ok: false, reason: "state" };
  if (r.maker === checker) return { ok: false, reason: "maker" };
  r.status = "POSTED";
  r.checker = checker;
  r.postedAt = today();
  return { ok: true, run: r };
}

/** Statement CSV for a seller — integer paise in, rupee strings out. */
export async function statementCsv(seller: string): Promise<string> {
  const runs = await runsForSeller(seller);
  const head = "run_id,period,gross_inr,commission_inr,net_inr,status,posted_at";
  const rows = runs.map((r) =>
    [r.id, `"${r.period}"`, (r.grossPaise / 100).toFixed(2), (r.commissionPaise / 100).toFixed(2), (r.netPaise / 100).toFixed(2), r.status, r.postedAt ?? ""].join(","),
  );
  return [head, ...rows].join("\n");
}
