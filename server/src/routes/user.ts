import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { getProfile, updateProfile } from "../controllers/userController.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email").optional(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters")
    .optional(),
});

router.use(authenticate);

router.get("/profile", getProfile);
router.put("/profile", validate(updateProfileSchema), updateProfile);

export default router;
