import "server-only";

/**
 * VEDIC HEMP — BUYER WALLET (store-credit ledger)
 *
 * A real, append-only ledger of a buyer's wallet movements: cashback, promos,
 * refunds in, spends out, withdrawals. The balance is COMPUTED from posted
 * rows — never a stored number that can drift.
 *
 * This is where "refund the buyer first" lands: a cancellation or an approved
 * return credits the wallet immediately (instant store credit), and seller
 * recovery is a separate, slower ledger. Money is integer paise, always.
 *
 * Store = the DB seam (a `WalletTxn` table keyed by buyer email).
 */

export type WalletKind = "CASHBACK" | "REFUND" | "PROMO" | "DEBIT" | "WITHDRAWAL" | "ADJUST";
export type WalletStatus = "POSTED" | "PROCESSING";

export interface WalletTxn {
  id: string;
  buyerEmail: string;
  at: string; // YYYY-MM-DD
  kind: WalletKind;
  note: string;
  amountPaise: number; // signed — credits positive, debits negative
  status: WalletStatus;
  ref?: string; // order reference, when applicable
}

interface WalletStore {
  txns: WalletTxn[];
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhWallet: WalletStore | undefined;
}

function seed(): WalletStore {
  const txns: WalletTxn[] = [
    { id: "w1", buyerEmail: "buyer@example.in", at: "2026-07-08", kind: "CASHBACK", note: "Order VH2026070912 · 2% cashback", amountPaise: 3538, status: "POSTED" },
    { id: "w2", buyerEmail: "buyer@example.in", at: "2026-07-02", kind: "REFUND", note: "Return · order VH2026062810", amountPaise: 249900, status: "POSTED" },
    { id: "w3", buyerEmail: "buyer@example.in", at: "2026-06-30", kind: "PROMO", note: "Welcome bonus", amountPaise: 10000, status: "POSTED" },
    { id: "w4", buyerEmail: "buyer@example.in", at: "2026-06-28", kind: "DEBIT", note: "Applied to order VH2026062810", amountPaise: -50000, status: "POSTED" },
    { id: "w5", buyerEmail: "buyer@example.in", at: "2026-06-20", kind: "WITHDRAWAL", note: "Payout to bank ····4471", amountPaise: -100000, status: "PROCESSING" },
  ];
  return { txns, seq: txns.length + 1 };
}

function store(): WalletStore {
  globalThis.__vhWallet ??= seed();
  return globalThis.__vhWallet;
}

export async function ledger(email: string): Promise<WalletTxn[]> {
  return store().txns
    .filter((t) => t.buyerEmail.toLowerCase() === email.toLowerCase())
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : b.id.localeCompare(a.id)));
}

/** Available balance — posted rows only. Processing rows are pending, not yet spendable. */
export async function balancePaise(email: string): Promise<number> {
  return store().txns
    .filter((t) => t.buyerEmail.toLowerCase() === email.toLowerCase() && t.status === "POSTED")
    .reduce((n, t) => n + t.amountPaise, 0);
}

export async function processingPaise(email: string): Promise<number> {
  return store().txns
    .filter((t) => t.buyerEmail.toLowerCase() === email.toLowerCase() && t.status === "PROCESSING")
    .reduce((n, t) => n + t.amountPaise, 0);
}

/** Sum of credits by kind, for the "where your balance comes from" breakdown. */
export async function creditBreakdown(email: string): Promise<{ cashbackPaise: number; promoPaise: number; refundsPaise: number }> {
  const rows = store().txns.filter((t) => t.buyerEmail.toLowerCase() === email.toLowerCase() && t.status === "POSTED" && t.amountPaise > 0);
  const sum = (k: WalletKind) => rows.filter((t) => t.kind === k).reduce((n, t) => n + t.amountPaise, 0);
  return { cashbackPaise: sum("CASHBACK"), promoPaise: sum("PROMO"), refundsPaise: sum("REFUND") };
}

const today = () => new Date().toISOString().slice(0, 10);

export async function creditWallet(email: string, input: {
  kind: WalletKind; amountPaise: number; note: string; ref?: string; status?: WalletStatus;
}): Promise<WalletTxn> {
  const s = store();
  const txn: WalletTxn = {
    id: `w${s.seq++}`,
    buyerEmail: email,
    at: today(),
    kind: input.kind,
    note: input.note,
    amountPaise: input.amountPaise,
    status: input.status ?? "POSTED",
    ...(input.ref ? { ref: input.ref } : {}),
  };
  s.txns.unshift(txn);
  return txn;
}
