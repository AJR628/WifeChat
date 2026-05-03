import { Router, type IRouter } from "express";
import healthRouter from "./health";
import coachRouter from "./coach";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(coachRouter);
router.use(chatRouter);

export default router;
