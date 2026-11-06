import { Router, type IRouter } from "express";
import healthRouter from "./health";
import santiRouter from "./santi";
import geminiRouter from "./gemini";
import globalRouter from "./global";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/santi", santiRouter);
router.use("/gemini", geminiRouter);
router.use("/global", globalRouter);

export default router;
