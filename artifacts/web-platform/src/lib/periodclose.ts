import "server-only";

/**
 * VEDIC HEMP — PERIOD CLOSE PRECONDITIONS
 *
 * Closing a settlement period locks every posted statement in it, so a close
 * may only be INITIATED once the period's money work is actually finished.
 * Each item below is DERIVED from the live stores on every read — there is no
 * stored "done" flag, because a tickable box is a way to close a period whose
 * work is still open.
 *
 * The checker sign-off that follows initiation (A6) is deliberately NOT a
 * precondition: requiring it before the maker step would make a close
 * unreachable. It is enforced after initiation, by a second, different admin.
 */

import { allOrders } from "@/lib/orders";
import { allWithdrawals } from "@/lib/earnings";
import { allRuns } from "@/lib/settlements";

export interface CloseCheckItem {
  key: string;
  label: string;
  done: boolean;
  detail?: string; // what is still open, when it is not
}

export async function periodCloseChecklist(): Promise<CloseCheckItem[]> {
  const runs = (await allRuns()).filter((r) => r.status === "AWAITING_CHECKER");
  const payouts = (await allWithdrawals()).filter((w) => w.status === "PENDING" || w.status === "APPROVED");
  const orders = await allOrders();
  const returns = orders.filter((o) => o.status === "RETURN_REQUESTED" || o.status === "RETURN_APPROVED");
  const recovery = orders.filter((o) => o.sellerRecovery === "PENDING");

  return [
    {
      key: "settlements",
      label: "Every settlement run posted — none left awaiting its checker",
      done: runs.length === 0,
      ...(runs.length ? { detail: `${runs.length} run${runs.length === 1 ? "" : "s"} awaiting a checker` } : {}),
    },
    {
      key: "payouts",
      label: "Every vendor payout request settled or cancelled",
      done: payouts.length === 0,
      ...(payouts.length ? { detail: `${payouts.length} withdrawal${payouts.length === 1 ? "" : "s"} still in flight` } : {}),
    },
    {
      key: "returns",
      label: "Every return adjudicated — nothing waiting on a refund decision",
      done: returns.length === 0,
      ...(returns.length ? { detail: `${returns.length} return${returns.length === 1 ? "" : "s"} open` } : {}),
    },
    {
      key: "recovery",
      label: "Refund float reconciled — every seller recovery closed",
      done: recovery.length === 0,
      ...(recovery.length ? { detail: `${recovery.length} recovery ledger${recovery.length === 1 ? "" : "s"} pending` } : {}),
    },
  ];
}

/** The items still open. A close cannot be initiated while this is non-empty. */
export async function periodCloseBlockers(): Promise<CloseCheckItem[]> {
  return (await periodCloseChecklist()).filter((c) => !c.done);
}
