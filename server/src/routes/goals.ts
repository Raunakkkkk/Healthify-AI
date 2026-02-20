import { Router } from "express";
import { getGoals, createGoal, updateGoal } from "../controllers/goalController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";

const router = Router();

const goalSchema = z.object({
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).nullable().optional(),
  calorieTarget: z.number().min(0),
  proteinTarget: z.number().min(0).optional(),
  carbsTarget: z.number().min(0).optional(),
  fatTarget: z.number().min(0).optional(),
  weightGoal: z.number().nullable().optional(),
});

router.use(authenticate);
router.get("/", getGoals as any);
router.post("/", validate(goalSchema), createGoal as any);
router.put("/:id", updateGoal as any);

export default router;
