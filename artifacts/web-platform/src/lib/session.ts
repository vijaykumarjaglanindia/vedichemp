/**
 * VEDIC HEMP — VIEWER CONTEXT (presentation stub)
 *
 * In production this is derived from the Auth.js session: roles come from the
 * verified token, never from the client. The dashboards render against this
 * shape. Swapping the stub for the real session resolver changes nothing in the
 * pages — they already treat roles as server-authoritative.
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

/** The demo viewer used to render the buyer console. Verified, no active Rx. */
export function currentBuyer(): Viewer {
  return {
    userId: "demo-buyer",
    firstName: "Ananya",
    roles: ["ROLE_BUYER", "ROLE_BUYER_VERIFIED"],
    membershipTier: "Leaf",
    hasRx: false,
    rxDaysToExpiry: null,
    consents: { analytics: true, personalisation: true, marketing: false },
    permittedClasses: permittedClasses({ hasRx: false }),
    impersonated: false,
  };
}
