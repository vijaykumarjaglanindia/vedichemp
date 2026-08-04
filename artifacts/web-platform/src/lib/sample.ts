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

