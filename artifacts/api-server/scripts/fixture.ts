/**
 * VEDIC HEMP — DEVELOPMENT FIXTURE
 *
 * There is no seed data in this platform. Every list starts empty. A product
 * exists when a verified seller creates it; a prescription exists when a buyer
 * uploads one and a pharmacist signs it.
 *
 * This script exists so you have something to click during development. It has
 * three independent guards, because a fixture that reaches production is how a
 * fake `coa: true` ends up on a real listing.
 *
 *   pnpm db:fixture
 */

import { PrismaClient, ComplianceClass, ListingState } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "";

/* ── Guard 1: never in production ─────────────────────────────────────── */
if (process.env.NODE_ENV === "production") {
  throw new Error("fixture: refusing to run with NODE_ENV=production.");
}

/* ── Guard 2: the database must be named for development ─────────────── */
if (!/\/vedichemp_dev(\?|$)/.test(url)) {
  throw new Error(
    `fixture: refusing to run. DATABASE_URL must point at a database named 'vedichemp_dev'.\n` +
      `Got: ${url.replace(/:[^:@]+@/, ":****@")}`
  );
}

/* ── Guard 3: the database must be empty of real orders ──────────────── */
const db = new PrismaClient();

async function main() {
  const orders = await db.order.count();
  if (orders > 0) {
    throw new Error(`fixture: refusing to run. This database has ${orders} orders — it is not a scratch database.`);
  }

  console.log("Creating a throwaway seller, one compliant product, and one that is deliberately blocked.\n");

  const seller = await db.seller.create({
    data: {
      legalName: "Fixture Hemp Co. (DEV ONLY)",
      gstin: "05AABCF0000M1Z9",
      pan: "AABCF0000M",
      state: "ACTIVE",
      licences: {
        create: [
          { type: "FSSAI", number: "DEV-FSSAI-0001", authority: "FSSAI", validTill: plusDays(365), verified: true, unlocksClass: ComplianceClass.HEMP_FOOD },
          { type: "AYUSH", number: "DEV-AYUSH-0001", authority: "State AYUSH", validTill: plusDays(365), verified: true, unlocksClass: ComplianceClass.CBD_WELLNESS },
        ],
      },
    },
  });

  // (a) A hemp food. Needs no CoA. Goes live immediately.
  await db.product.create({
    data: {
      sellerId: seller.id,
      title: "Hemp Hearts 500g",
      slug: "fixture-hemp-hearts-500g",
      complianceClass: ComplianceClass.HEMP_FOOD,
      listingState: ListingState.LIVE,
      mrpPaise: 99_900,
      pricePaise: 74_900,
      batches: { create: [{ batchCode: "DEV-FOOD-01", mfgDate: plusDays(-30), expiryDate: plusDays(300), quantity: 100 }] },
    },
  });

  // (b) A CBD product with NO lab report. It stays in DRAFT.
  //     Try to publish it and Prohibition A2 will stop you. That is the point.
  const cbd = await db.product.create({
    data: {
      sellerId: seller.id,
      title: "CBD Oil 1000mg (no CoA — will not publish)",
      slug: "fixture-cbd-oil-1000mg",
      complianceClass: ComplianceClass.CBD_WELLNESS,
      listingState: ListingState.DRAFT,
      mrpPaise: 299_900,
      pricePaise: 249_900,
      batches: { create: [{ batchCode: "DEV-CBD-01", mfgDate: plusDays(-20), expiryDate: plusDays(400), quantity: 40 }] },
    },
    include: { batches: true },
  });

  console.log("✔ Seller:", seller.legalName);
  console.log("✔ Live:   Hemp Hearts 500g (HEMP_FOOD — no CoA needed)");
  console.log("✔ Draft:  CBD Oil 1000mg (CBD_WELLNESS — blocked, no approved CoA)\n");
  console.log("Now try to publish the CBD product. A2 will refuse:");
  console.log(`  pnpm tsx -e "import {publishProduct} from './src/server/catalogue/publish'; publishProduct({productId:'${cbd.id}', actor:'dev'})"\n`);
  console.log("No prescriptions, no orders, no settlements are created. Those require real people.");
}

function plusDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

main()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => db.$disconnect());
