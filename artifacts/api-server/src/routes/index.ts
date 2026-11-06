import { Router, type IRouter } from "express";
import healthRouter from "./health";
import santiRouter from "./santi";
import geminiRouter from "./gemini";
import globalRouter from "./global";
import { requireSession, requireRole } from "../lib/global/security";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/santi", santiRouter);
// Unused legacy conversation endpoints must not expose chat histories publicly.
router.use("/gemini", requireSession, requireRole("director"), geminiRouter);
router.use("/global", globalRouter);

export default router;
