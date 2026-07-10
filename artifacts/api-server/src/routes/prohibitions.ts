import { Router, type IRouter } from "express";
import { GetProhibitionStatusResponse } from "@workspace/api-zod";
import { db } from "../lib/db";

const router: IRouter = Router();

/**
 * Enforcement status of prohibitions A1-A6, read live from the
 * prohibition_status view created by migration 0001_prohibitions.
 * See VEDICHEMP.md — "Check enforcement at any time, including in production."
 */
router.get("/prohibitions", async (req, res) => {
  try {
    const rows = await db.$queryRaw<{ code: string; enforced: boolean }[]>`
      SELECT code, enforced FROM prohibition_status ORDER BY code
    `;
    const data = GetProhibitionStatusResponse.parse(rows);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "failed to read prohibition_status");
    res.status(500).json({ error: "Unable to read prohibition status" });
  }
});

export default router;
