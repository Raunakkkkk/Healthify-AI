import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import { streamText, tool } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { extractNutritionFromImage } from "../ai/gemini.js";
import ImageUpload from "../models/ImageUpload.js";
import FoodEntry from "../models/FoodEntry.js";
import Goal from "../models/Goal.js";
import ChatMessage from "../models/ChatMessage.js";
import { getWeeklyCalories, getGoalVsActual } from "../services/reportService.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

export async function extractNutrition(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "calorie-tracker", resource_type: "image" },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      stream.end(req.file!.buffer);
    });

    const extraction = await extractNutritionFromImage(uploadResult.secure_url);

    const imageUpload = await ImageUpload.create({
      userId: req.userId,
      imageUrl: uploadResult.secure_url,
      extractedText: extraction.rawText || "",
      extractedNutrition: { foods: extraction.foods },
      confidenceScore: extraction.confidence,
    });

    res.json({
      imageId: imageUpload._id,
      imageUrl: uploadResult.secure_url,
      foods: extraction.foods,
      confidence: extraction.confidence,
      rawText: extraction.rawText,
    });
  } catch (err) {
    console.error("AI extraction error:", err);
    res.status(500).json({
      error: "Failed to extract nutrition from image. Please try manual entry.",
      fallbackToManual: true,
    });
  }
}

export async function chat(req: AuthRequest, res: Response) {
  try {
    const { messages } = req.body;
    const userId = req.userId!;

    // Fetch user context for the system prompt
    const [currentGoal, todayStart, todayEnd] = await Promise.all([
      Goal.findOne({ userId: new mongoose.Types.ObjectId(userId), endDate: null }).sort({ startDate: -1 }).lean(),
      (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })(),
      (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; })(),
    ]);

    const todayEntries = await FoodEntry.find({
      userId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: todayStart, $lte: todayEnd },
    }).lean();

    const todayTotals = todayEntries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + (e.macros?.protein || 0),
        carbs: acc.carbs + (e.macros?.carbs || 0),
        fats: acc.fats + (e.macros?.fats || 0),
        count: acc.count + 1,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, count: 0 }
    );

    const systemPrompt = `You are NutriTrack AI, a friendly and knowledgeable nutrition assistant inside a calorie tracking app.

CURRENT USER CONTEXT:
- Today's intake: ${todayTotals.calories} kcal, ${todayTotals.protein}g protein, ${todayTotals.carbs}g carbs, ${todayTotals.fats}g fats (${todayTotals.count} entries)
- Goals: ${currentGoal ? `${currentGoal.calorieTarget} kcal, ${currentGoal.proteinTarget}g protein, ${currentGoal.carbsTarget}g carbs, ${currentGoal.fatTarget}g fats` : "No goals set yet"}
- Today's entries: ${todayEntries.map(e => `${e.foodName} (${e.calories} kcal, ${e.mealType})`).join(", ") || "None yet"}

CAPABILITIES — use the available tools to:
1. Log meals: When user says they ate something, use logMeal. Estimate calories/macros accurately. Always confirm what you logged.
2. Edit entries: Use editEntry when user wants to correct a food entry (e.g., "change my lunch to 300 calories"). Call getTodayEntries first to find the entry ID.
3. Delete entries: Use deleteEntry when user wants to remove a food entry (e.g., "delete the banana I logged"). Call getTodayEntries first to find the entry ID.
4. Check today's food: Use getTodayEntries to show what they ate and totals.
5. Past entries: Use getEntriesByDate to look up food logged on a specific date.
6. Weekly summary: Use getWeeklySummary for 7-day trends and averages.
7. Goal management: Use getCurrentGoals to check goals, updateGoal to change them, or deleteGoal to remove goals.
8. Nutrition questions: Answer directly from your knowledge — calories in foods, healthy alternatives, diet tips, etc.

RULES:
- Be concise — 2-3 sentences max unless the user asks for detail.
- When logging food, estimate realistic portion sizes for Indian, Asian, Western cuisines.
- After logging, always mention the calories added and updated daily total.
- Use encouraging, supportive tone. Celebrate when they're on track.
- If unsure about a food's nutrition, give your best estimate and mention it's approximate.
- For meal type, infer from context or time of day if not specified.
- For edits and deletes, ALWAYS call getTodayEntries (or getEntriesByDate) first to get the entry ID. Never guess an ID.
- Confirm with the user what was deleted or edited.`;

    const result = streamText({
      model: google("gemini-2.0-flash"),
      system: systemPrompt,
      messages,
      tools: {
        logMeal: tool({
          description: "Log a food entry for the user. Use this when the user says they ate something. Estimate nutrition if not provided.",
          parameters: z.object({
            foodName: z.string().describe("Name of the food item"),
            mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).describe("Type of meal"),
            calories: z.number().describe("Estimated calories"),
            protein: z.number().describe("Protein in grams"),
            carbs: z.number().describe("Carbs in grams"),
            fats: z.number().describe("Fats in grams"),
            quantity: z.number().describe("Quantity consumed"),
            unit: z.string().describe("Unit of measurement (serving, piece, cup, bowl, plate, g, etc.)"),
          }),
          execute: async ({ foodName, mealType, calories, protein, carbs, fats, quantity, unit }) => {
            const entry = await FoodEntry.create({
              userId: new mongoose.Types.ObjectId(userId),
              mealType,
              foodName,
              quantity,
              unit,
              calories,
              macros: { protein, carbs, fats },
              source: "ai",
              timestamp: new Date(),
            });

            const updatedEntries = await FoodEntry.find({
              userId: new mongoose.Types.ObjectId(userId),
              timestamp: { $gte: todayStart, $lte: todayEnd },
            }).lean();

            const newTotals = updatedEntries.reduce(
              (acc, e) => ({
                calories: acc.calories + e.calories,
                protein: acc.protein + (e.macros?.protein || 0),
                carbs: acc.carbs + (e.macros?.carbs || 0),
                fats: acc.fats + (e.macros?.fats || 0),
              }),
              { calories: 0, protein: 0, carbs: 0, fats: 0 }
            );

            return {
              success: true,
              entryId: entry._id,
              logged: { foodName, mealType, calories, protein, carbs, fats, quantity, unit },
              dailyTotals: newTotals,
              goalTarget: currentGoal?.calorieTarget || null,
            };
          },
        }),

        getTodayEntries: tool({
          description: "Get all food entries for today with totals. Use when user asks what they ate or their current intake.",
          parameters: z.object({}),
          execute: async () => {
            const entries = await FoodEntry.find({
              userId: new mongoose.Types.ObjectId(userId),
              timestamp: { $gte: todayStart, $lte: todayEnd },
            }).sort({ timestamp: 1 }).lean();

            const totals = entries.reduce(
              (acc, e) => ({
                calories: acc.calories + e.calories,
                protein: acc.protein + (e.macros?.protein || 0),
                carbs: acc.carbs + (e.macros?.carbs || 0),
                fats: acc.fats + (e.macros?.fats || 0),
              }),
              { calories: 0, protein: 0, carbs: 0, fats: 0 }
            );

            return {
              entries: entries.map((e) => ({
                id: e._id,
                foodName: e.foodName,
                mealType: e.mealType,
                calories: e.calories,
                protein: e.macros?.protein || 0,
                carbs: e.macros?.carbs || 0,
                fats: e.macros?.fats || 0,
                time: e.timestamp,
              })),
              totals,
              goal: currentGoal ? {
                calories: currentGoal.calorieTarget,
                protein: currentGoal.proteinTarget,
                carbs: currentGoal.carbsTarget,
                fats: currentGoal.fatTarget,
              } : null,
              remaining: currentGoal ? {
                calories: currentGoal.calorieTarget - totals.calories,
                protein: currentGoal.proteinTarget - totals.protein,
                carbs: currentGoal.carbsTarget - totals.carbs,
                fats: currentGoal.fatTarget - totals.fats,
              } : null,
            };
          },
        }),

        getWeeklySummary: tool({
          description: "Get 7-day nutrition summary with daily breakdown. Use for weekly trends, averages, and progress.",
          parameters: z.object({}),
          execute: async () => {
            const [weekly, goalVsActual] = await Promise.all([
              getWeeklyCalories(userId),
              getGoalVsActual(userId),
            ]);

            return {
              daily: weekly,
              averages: goalVsActual.averages,
              targets: goalVsActual.targets,
            };
          },
        }),

        getCurrentGoals: tool({
          description: "Get the user's current nutrition goals. Use when they ask about their targets.",
          parameters: z.object({}),
          execute: async () => {
            const goal = await Goal.findOne({
              userId: new mongoose.Types.ObjectId(userId),
              endDate: null,
            }).sort({ startDate: -1 }).lean();

            if (!goal) return { hasGoals: false, message: "No goals set yet." };

            return {
              hasGoals: true,
              calories: goal.calorieTarget,
              protein: goal.proteinTarget,
              carbs: goal.carbsTarget,
              fats: goal.fatTarget,
              weight: goal.weightGoal,
              since: goal.startDate,
            };
          },
        }),

        updateGoal: tool({
          description: "Update the user's nutrition goal. Use when they want to change a target. Set 0 for targets they don't want to track.",
          parameters: z.object({
            calorieTarget: z.number().describe("Daily calorie target (0 if not tracking)"),
            proteinTarget: z.number().describe("Daily protein target in grams (0 if not tracking)"),
            carbsTarget: z.number().describe("Daily carbs target in grams (0 if not tracking)"),
            fatTarget: z.number().describe("Daily fat target in grams (0 if not tracking)"),
            weightGoal: z.number().nullable().describe("Target weight in kg, or null"),
          }),
          execute: async ({ calorieTarget, proteinTarget, carbsTarget, fatTarget, weightGoal }) => {
            await Goal.updateMany(
              { userId: new mongoose.Types.ObjectId(userId), endDate: null },
              { endDate: new Date() }
            );

            const newGoal = await Goal.create({
              userId: new mongoose.Types.ObjectId(userId),
              startDate: new Date(),
              calorieTarget,
              proteinTarget,
              carbsTarget,
              fatTarget,
              weightGoal,
            });

            return {
              success: true,
              goals: { calorieTarget, proteinTarget, carbsTarget, fatTarget, weightGoal },
            };
          },
        }),

        editEntry: tool({
          description: "Edit an existing food entry. Use getTodayEntries first to get the entry ID. Only update fields the user mentioned — keep others unchanged.",
          parameters: z.object({
            entryId: z.string().describe("The _id of the food entry to edit"),
            foodName: z.string().optional().describe("New food name, if changing"),
            mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional().describe("New meal type, if changing"),
            calories: z.number().optional().describe("New calorie count, if changing"),
            protein: z.number().optional().describe("New protein in grams, if changing"),
            carbs: z.number().optional().describe("New carbs in grams, if changing"),
            fats: z.number().optional().describe("New fats in grams, if changing"),
            quantity: z.number().optional().describe("New quantity, if changing"),
            unit: z.string().optional().describe("New unit, if changing"),
          }),
          execute: async ({ entryId, foodName, mealType, calories, protein, carbs, fats, quantity, unit }) => {
            const update: any = {};
            if (foodName !== undefined) update.foodName = foodName;
            if (mealType !== undefined) update.mealType = mealType;
            if (calories !== undefined) update.calories = calories;
            if (quantity !== undefined) update.quantity = quantity;
            if (unit !== undefined) update.unit = unit;
            if (protein !== undefined || carbs !== undefined || fats !== undefined) {
              const existing = await FoodEntry.findById(entryId).lean();
              update.macros = {
                protein: protein ?? existing?.macros?.protein ?? 0,
                carbs: carbs ?? existing?.macros?.carbs ?? 0,
                fats: fats ?? existing?.macros?.fats ?? 0,
              };
            }

            const entry = await FoodEntry.findOneAndUpdate(
              { _id: entryId, userId: new mongoose.Types.ObjectId(userId) },
              update,
              { new: true }
            ).lean();

            if (!entry) return { success: false, error: "Entry not found" };

            return {
              success: true,
              updated: {
                foodName: entry.foodName,
                mealType: entry.mealType,
                calories: entry.calories,
                protein: entry.macros?.protein,
                carbs: entry.macros?.carbs,
                fats: entry.macros?.fats,
              },
            };
          },
        }),

        deleteEntry: tool({
          description: "Delete a food entry. Use getTodayEntries first to find the entry ID. Confirm what was deleted.",
          parameters: z.object({
            entryId: z.string().describe("The _id of the food entry to delete"),
          }),
          execute: async ({ entryId }) => {
            const entry = await FoodEntry.findOneAndDelete({
              _id: entryId,
              userId: new mongoose.Types.ObjectId(userId),
            }).lean();

            if (!entry) return { success: false, error: "Entry not found" };

            return {
              success: true,
              deleted: {
                foodName: entry.foodName,
                mealType: entry.mealType,
                calories: entry.calories,
              },
            };
          },
        }),

        deleteGoal: tool({
          description: "Delete the user's active goal. Use when user wants to remove/clear their goals.",
          parameters: z.object({}),
          execute: async () => {
            const result = await Goal.deleteMany({
              userId: new mongoose.Types.ObjectId(userId),
              endDate: null,
            });

            return {
              success: true,
              deletedCount: result.deletedCount,
            };
          },
        }),

        getEntriesByDate: tool({
          description: "Get food entries for a specific date (not today). Use when user asks about a past day, e.g. 'what did I eat yesterday'.",
          parameters: z.object({
            date: z.string().describe("Date in YYYY-MM-DD format"),
          }),
          execute: async ({ date }) => {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);

            const entries = await FoodEntry.find({
              userId: new mongoose.Types.ObjectId(userId),
              timestamp: { $gte: start, $lte: end },
            }).sort({ timestamp: 1 }).lean();

            const totals = entries.reduce(
              (acc, e) => ({
                calories: acc.calories + e.calories,
                protein: acc.protein + (e.macros?.protein || 0),
                carbs: acc.carbs + (e.macros?.carbs || 0),
                fats: acc.fats + (e.macros?.fats || 0),
              }),
              { calories: 0, protein: 0, carbs: 0, fats: 0 }
            );

            return {
              date,
              entries: entries.map((e) => ({
                id: e._id,
                foodName: e.foodName,
                mealType: e.mealType,
                calories: e.calories,
                protein: e.macros?.protein || 0,
                carbs: e.macros?.carbs || 0,
                fats: e.macros?.fats || 0,
                time: e.timestamp,
              })),
              totals,
              entryCount: entries.length,
            };
          },
        }),
      },
      maxSteps: 8,
    });

    result.pipeDataStreamToResponse(res);
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Chat failed" });
  }
}

export async function getChatHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const messages = await ChatMessage.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(messages.reverse());
  } catch (err) {
    next(err);
  }
}
