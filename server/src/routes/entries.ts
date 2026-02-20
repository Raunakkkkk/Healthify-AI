import { Router } from "express";
import {
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
} from "../controllers/entryController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";

const router = Router();

const entrySchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  foodName: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  calories: z.number().min(0),
  macros: z
    .object({
      protein: z.number().min(0).optional(),
      carbs: z.number().min(0).optional(),
      fats: z.number().min(0).optional(),
    })
    .optional(),
  micronutrients: z.record(z.number()).optional(),
  timestamp: z.string().or(z.date()).optional(),
  source: z.enum(["manual", "ai"]).optional(),
  imageId: z.string().nullable().optional(),
});

router.use(authenticate);
router.get("/", getEntries as any);
router.post("/", validate(entrySchema), createEntry as any);
router.put("/:id", updateEntry as any);
router.delete("/:id", deleteEntry as any);

export default router;
