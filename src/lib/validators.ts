import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const goalSchema = z.object({
  calorieTarget: z.number().min(500, "Minimum 500 calories").max(10000),
  proteinTarget: z.number().min(0).max(500),
  carbsTarget: z.number().min(0).max(1000),
  fatTarget: z.number().min(0).max(500),
  weightGoal: z.number().nullable().optional(),
});

export const foodEntrySchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  foodName: z.string().min(1, "Food name is required"),
  quantity: z.number().min(0.1, "Quantity must be greater than 0"),
  unit: z.string().min(1, "Unit is required"),
  calories: z.number().min(0, "Calories must be 0 or more"),
  macros: z.object({
    protein: z.number().min(0).optional(),
    carbs: z.number().min(0).optional(),
    fats: z.number().min(0).optional(),
  }).optional(),
  micronutrients: z.record(z.number()).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type FoodEntryInput = z.infer<typeof foodEntrySchema>;
