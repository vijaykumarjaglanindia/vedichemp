import { Router, type IRouter } from "express";
import healthRouter from "./health";
import prohibitionsRouter from "./prohibitions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(prohibitionsRouter);

export default router;
