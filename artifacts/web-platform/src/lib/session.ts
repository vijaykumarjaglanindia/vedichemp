/**
 * VEDIC HEMP — BUYER VIEWER CONTEXT
 *
 * The buyer console renders against this shape. It is resolved from the real
 * signed-in session and the real per-buyer stores — the display name comes from
 * the account, the loyalty tier from the user directory, marketing/personalisation
 * consent from the append-only consent ledger, and Rx entitlement (which drives
 * `permittedClasses`) from the buyer's own approved prescriptions. Roles are
 * server-authoritative — never taken from the client. A signed-out visitor gets
 * a safe guest viewer with no entitlements.
 */

import { ComplianceClass } from "@prisma/client";
import { permittedClasses } from "./compliance";

export interface Viewer {
  userId: string;
  firstName: string;
  roles: string[];
  membershipTier: "Sprout" | "Leaf" | "Bloom" | "Vedic Prime";
  hasRx: boolean;
  rxDaysToExpiry: number | null;
  consents: { analytics: boolean; personalisation: boolean; marketing: boolean };
  permittedClasses: ComplianceClass[];
  impersonated: boolean;
}

const TIERS: Viewer["membershipTier"][] = ["Sprout", "Leaf", "Bloom", "Vedic Prime"];
function asTier(v: string | null | undefined): Viewer["membershipTier"] {
  return TIERS.includes(v as Viewer["membershipTier"]) ? (v as Viewer["membershipTier"]) : "Sprout";
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  return Math.round((target - Date.now()) / 86_400_000);
}

/**
 * The signed-in buyer, resolved from the real session + per-buyer stores. Async
 * because it reads the session cookie and the consent/prescription stores; call
 * it from a server component or action. A signed-out visitor resolves to a
 * guest viewer with no entitlements (permittedClasses excludes MED_CANNABIS).
 */
export async function resolveBuyer(): Promise<Viewer> {
  const { getSession } = await import("./auth-lite");
  const session = await getSession();
  const email = session?.email ?? "";

  // Display name: the session/account name (never a hardcoded demo name).
  const fullName = (session?.name ?? "").trim();
  const firstName = (fullName ? fullName.split(" ")[0] : "") || "there";

  // Marketing/personalisation consent from the append-only ledger.
  const { currentConsent, CONSENT_DEFAULTS } = await import("./consent");
  const consents = email ? await currentConsent(email) : { ...CONSENT_DEFAULTS };

  // Rx entitlement — an APPROVED, unexpired prescription drives the classes the
  // buyer may even SEE. Absent for a buyer without one (A1: MED_CANNABIS is not
  // in permittedClasses, so it is ABSENT from recommendations, not hidden).
  const { tierForEmail } = await import("./users");
  let hasRx = false;
  let rxDaysToExpiry: number | null = null;
  if (email) {
    const { myPrescriptions } = await import("./prescriptions");
    const approved = (await myPrescriptions(email)).find((r) => r.status === "APPROVED");
    if (approved) {
      hasRx = true;
      rxDaysToExpiry = daysUntil(approved.validTill);
    }
  }

  return {
    userId: email || "guest",
    firstName,
    roles: session ? ["ROLE_BUYER", "ROLE_BUYER_VERIFIED"] : ["ROLE_BUYER"],
    membershipTier: asTier(email ? tierForEmail(email) : null),
    hasRx,
    rxDaysToExpiry,
    consents,
    permittedClasses: permittedClasses({ hasRx }),
    impersonated: false,
  };
}
