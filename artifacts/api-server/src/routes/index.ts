import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sessionsRouter from "./sessions";
import feedbackRouter from "./feedback";
import progressRouter from "./progress";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sessionsRouter);
router.use(feedbackRouter);
router.use(progressRouter);

export default router;
