import { PrismaClient } from "@prisma/client";

/**
 * The application connects as `vedichemp_app`, a role WITHOUT update or delete
 * on the WORM tables (AuditLog, SensitiveAccessLog, AdverseEvent, WalletEntry,
 * Consent). See prisma/roles.sql and migration 0001. If you find yourself
 * needing those grants, you are about to break Prohibition A3.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
