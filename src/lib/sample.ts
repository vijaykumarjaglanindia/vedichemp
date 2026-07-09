/**
 * VEDIC HEMP — PRESENTATION SAMPLE DATA
 *
 * This is *illustrative UI data*, not database seed. The real platform starts
 * empty by design (see README: "What is real, and what is not"): a product
 * appears when a verified seller creates it, a prescription when a buyer uploads
 * one and a pharmacist signs it. These records let the consoles be reviewed with
 * realistic content without a live Postgres. They deliberately contain NO
 * advertisable MED_CANNABIS surface (A1).
 */

import { ComplianceClass } from "@prisma/client";

export interface SampleProduct {
  id: string; title: string; slug: string; cls: ComplianceClass;
  pricePaise: number; mrpPaise: number; seller: string; rating: number;
  emoji: string; labVerified: boolean; state: string;
}

export const PRODUCTS: SampleProduct[] = [
  { id: "p1", title: "Cold-Pressed Hemp Seed Oil 250ml", slug: "hemp-seed-oil-250ml", cls: "HEMP_FOOD", pricePaise: 74900, mrpPaise: 99900, seller: "Himalayan Hemp Co.", rating: 4.6, emoji: "🫒", labVerified: false, state: "LIVE" },
  { id: "p2", title: "Hemp Protein Powder 500g", slug: "hemp-protein-500g", cls: "HEMP_FOOD", pricePaise: 89900, mrpPaise: 109900, seller: "Himalayan Hemp Co.", rating: 4.4, emoji: "🥤", labVerified: false, state: "LIVE" },
  { id: "p3", title: "Hemp Hearts 400g", slug: "hemp-hearts-400g", cls: "HEMP_FOOD", pricePaise: 64900, mrpPaise: 79900, seller: "Ananda Foods", rating: 4.7, emoji: "🌾", labVerified: false, state: "LIVE" },
  { id: "p4", title: "CBD Wellness Balm 30g", slug: "cbd-balm-30g", cls: "CBD_WELLNESS", pricePaise: 149900, mrpPaise: 199900, seller: "Vedic Botanicals", rating: 4.5, emoji: "🌿", labVerified: true, state: "LIVE" },
  { id: "p5", title: "CBD Ayurvedic Tincture 10ml", slug: "cbd-tincture-10ml", cls: "CBD_WELLNESS", pricePaise: 249900, mrpPaise: 299900, seller: "Vedic Botanicals", rating: 4.3, emoji: "💧", labVerified: true, state: "LIVE" },
  { id: "p6", title: "Ashwagandha Root Extract 60 caps", slug: "ashwagandha-60", cls: "AYURVEDA", pricePaise: 39900, mrpPaise: 54900, seller: "Ananda Foods", rating: 4.8, emoji: "🪔", labVerified: false, state: "LIVE" },
  { id: "p7", title: "Triphala Churna 200g", slug: "triphala-200g", cls: "AYURVEDA", pricePaise: 24900, mrpPaise: 29900, seller: "Ananda Foods", rating: 4.5, emoji: "🌱", labVerified: false, state: "LIVE" },
  { id: "p8", title: "CBD Muscle Relief Roll-On 50ml", slug: "cbd-rollon-50ml", cls: "CBD_WELLNESS", pricePaise: 129900, mrpPaise: 159900, seller: "Vedic Botanicals", rating: 4.2, emoji: "🧴", labVerified: true, state: "LIVE" },
];

export interface SampleOrder {
  id: string; reference: string; placedAt: string; status: string;
  totalPaise: number; items: { title: string; qty: number; emoji: string }[];
  eta?: string; buyer?: string; seller?: string;
}

export const ORDERS: SampleOrder[] = [
  { id: "o1", reference: "VH2026070912", placedAt: "2026-07-08", status: "OUT_FOR_DELIVERY", totalPaise: 176882, eta: "Today by 7 PM", buyer: "Ananya S.", seller: "Vedic Botanicals", items: [{ title: "CBD Wellness Balm 30g", qty: 1, emoji: "🌿" }] },
  { id: "o2", reference: "VH2026070845", placedAt: "2026-07-06", status: "SHIPPED", totalPaise: 89900, eta: "10 Jul", buyer: "Ananya S.", seller: "Himalayan Hemp Co.", items: [{ title: "Hemp Protein Powder 500g", qty: 1, emoji: "🥤" }] },
  { id: "o3", reference: "VH2026070233", placedAt: "2026-07-02", status: "DELIVERED", totalPaise: 129700, buyer: "Ananya S.", seller: "Ananda Foods", items: [{ title: "Hemp Hearts 400g", qty: 2, emoji: "🌾" }] },
  { id: "o4", reference: "VH2026063099", placedAt: "2026-06-30", status: "DELIVERED", totalPaise: 39900, buyer: "Rakesh P.", seller: "Ananda Foods", items: [{ title: "Ashwagandha 60 caps", qty: 1, emoji: "🪔" }] },
  { id: "o5", reference: "VH2026062810", placedAt: "2026-06-28", status: "RETURNED", totalPaise: 249900, buyer: "Meera K.", seller: "Vedic Botanicals", items: [{ title: "CBD Tincture 10ml", qty: 1, emoji: "💧" }] },
];

export interface SampleSeller {
  id: string; name: string; gstin: string; state: string; healthScore: number;
  classes: ComplianceClass[]; gmvPaise: number; kycState: string;
}

export const SELLERS: SampleSeller[] = [
  { id: "s1", name: "Vedic Botanicals", gstin: "27AABCV1234M1Z5", state: "ACTIVE", healthScore: 86, classes: ["CBD_WELLNESS", "AYURVEDA"], gmvPaise: 184_50_000_00 / 100, kycState: "KYC_APPROVED" },
  { id: "s2", name: "Himalayan Hemp Co.", gstin: "05AABCH9876M1Z2", state: "ACTIVE", healthScore: 74, classes: ["HEMP_FOOD"], gmvPaise: 92_10_000_00 / 100, kycState: "KYC_APPROVED" },
  { id: "s3", name: "Ananda Foods", gstin: "29AABCA4567M1Z8", state: "AT_RISK", healthScore: 58, classes: ["HEMP_FOOD", "AYURVEDA"], gmvPaise: 41_80_000_00 / 100, kycState: "KYC_APPROVED" },
  { id: "s4", name: "Green Leaf Naturals", gstin: "07AABCG1111M1Z0", state: "KYC_PENDING", healthScore: 0, classes: ["CBD_WELLNESS"], gmvPaise: 0, kycState: "KYC_PENDING" },
];

export interface QueueItem { id: string; kind: string; subject: string; sla: string; ageHours: number; class?: ComplianceClass }

export const COMPLIANCE_QUEUE: QueueItem[] = [
  { id: "q1", kind: "CoA Review", subject: "CBD Wellness Balm 30g · batch VB-2406", sla: "4h", ageHours: 1, class: "CBD_WELLNESS" },
  { id: "q2", kind: "Rx Verification", subject: "Prescription · order VH2026070912", sla: "4h", ageHours: 2, class: "MED_CANNABIS" },
  { id: "q3", kind: "CoA Review", subject: "CBD Tincture 10ml · batch VB-2409", sla: "4h", ageHours: 3, class: "CBD_WELLNESS" },
  { id: "q4", kind: "Ad Creative Review", subject: "Vedic Botanicals · 'Summer Wellness'", sla: "8h", ageHours: 5, class: "CBD_WELLNESS" },
];

export interface SettlementRow { id: string; seller: string; period: string; netPaise: number; status: string; maker: string; checker?: string }

export const SETTLEMENTS: SettlementRow[] = [
  { id: "st1", seller: "Vedic Botanicals", period: "16–30 Jun 2026", netPaise: 8_45_200_00, status: "AWAITING_CHECKER", maker: "finance.rao" },
  { id: "st2", seller: "Himalayan Hemp Co.", period: "16–30 Jun 2026", netPaise: 4_12_800_00, status: "AWAITING_CHECKER", maker: "finance.rao" },
  { id: "st3", seller: "Ananda Foods", period: "1–15 Jun 2026", netPaise: 2_03_400_00, status: "POSTED", maker: "finance.rao", checker: "finance.approver.iyer" },
];

export interface AuditRow { id: string; at: string; actor: string; action: string; entity: string; reason: string; outcome: string }

export const AUDIT: AuditRow[] = [
  { id: "a1", at: "2026-07-09 11:04", actor: "pharmacist.das", action: "RX_VERIFY", entity: "Prescription rx_8821", reason: "PRESCRIPTION_VERIFICATION", outcome: "SUCCESS" },
  { id: "a2", at: "2026-07-09 10:52", actor: "compliance.nair", action: "COA_APPROVE", entity: "LabReport lr_4410", reason: "COMPLIANCE", outcome: "SUCCESS" },
  { id: "a3", at: "2026-07-09 10:31", actor: "support.varma", action: "SENSITIVE_READ", entity: "Prescription rx_8790", reason: "DISPUTE_EVIDENCE", outcome: "DENIED" },
  { id: "a4", at: "2026-07-09 09:58", actor: "finance.approver.iyer", action: "SETTLEMENT_POST", entity: "Settlement st_3301", reason: "FINANCE", outcome: "SUCCESS" },
  { id: "a5", at: "2026-07-09 09:12", actor: "seller_ops.khan", action: "SELLER_SUSPEND", entity: "Seller s3", reason: "KYC_LAPSE", outcome: "SUCCESS" },
];

export const KPIS = {
  gmvTodayPaise: 18_42_60_000,
  ordersToday: 1284,
  aovPaise: 1_43_500,
  liveSellers: 312,
  rxPendingSla: 3,
  coaPendingSla: 6,
  disputesOpen: 14,
  auctionFillRate: 0.82,
};

export function classProducts(permitted: ComplianceClass[]): SampleProduct[] {
  return PRODUCTS.filter((p) => permitted.includes(p.cls));
}
