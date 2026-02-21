import { Router } from "express";
import { getGoals, createGoal, updateGoal, deleteGoal } from "../controllers/goalController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";

const router = Router();

const goalSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).nullable().optional(),
  targetDate: z.string().or(z.date()),
  calorieTarget: z.number().min(0),
  proteinTarget: z.number().min(0).optional(),
  carbsTarget: z.number().min(0).optional(),
  fatTarget: z.number().min(0).optional(),
  weightGoal: z.number().nullable().optional(),
});

const updateGoalSchema = goalSchema.partial();

router.use(authenticate);
router.get("/", getGoals as any);
router.post("/", validate(goalSchema), createGoal as any);
router.put("/:id", validate(updateGoalSchema), updateGoal as any);
router.delete("/:id", deleteGoal as any);

export default router;
