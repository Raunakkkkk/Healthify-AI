import { Router } from "express";
import {
  weeklyCalories,
  macros,
  micronutrients,
  goalVsActual,
} from "../controllers/reportController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);
router.get("/weekly-calories", weeklyCalories as any);
router.get("/macros", macros as any);
router.get("/micronutrients", micronutrients as any);
router.get("/goal-vs-actual", goalVsActual as any);

export default router;
