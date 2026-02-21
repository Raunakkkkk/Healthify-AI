import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { ollama } from "ollama-ai-provider-v2";
import { z } from "zod";
import { extractNutritionFromImage } from "../ai/ollamaVision.js";
import ImageUpload from "../models/ImageUpload.js";
import FoodEntry from "../models/FoodEntry.js";
import Goal from "../models/Goal.js";
import ChatMessage from "../models/ChatMessage.js";
import {
  getWeeklyCalories,
  getGoalVsActual,
} from "../services/reportService.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

export async function extractNutrition(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "calorie-tracker", resource_type: "image" },
        (err, result) => (err ? reject(err) : resolve(result)),
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

function getTodayRange(req: AuthRequest): { start: Date; end: Date } {
  // Same start/end as /api/entries: from query or headers (client's local "today")
  const rawStart =
    (req.query.start as string) ??
    (req.headers["x-today-start"] as string) ??
    (Array.isArray(req.headers["x-today-start"]) ? req.headers["x-today-start"][0] : undefined);
  const rawEnd =
    (req.query.end as string) ??
    (req.headers["x-today-end"] as string) ??
    (Array.isArray(req.headers["x-today-end"]) ? req.headers["x-today-end"][0] : undefined);
  if (typeof rawStart === "string" && typeof rawEnd === "string") {
    const start = new Date(rawStart);
    const end = new Date(rawEnd);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end) {
      return { start, end };
    }
  }
  // Fallback: server local today (may not match user's timezone)
  const d = new Date();
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getWeekRange(req: AuthRequest): { start: Date; end: Date } {
  const rawStart =
    (req.query.weekStart as string) ??
    (req.headers["x-week-start"] as string) ??
    (Array.isArray(req.headers["x-week-start"]) ? req.headers["x-week-start"][0] : undefined);
  const rawEnd =
    (req.query.weekEnd as string) ??
    (req.headers["x-week-end"] as string) ??
    (Array.isArray(req.headers["x-week-end"]) ? req.headers["x-week-end"][0] : undefined);
  if (typeof rawStart === "string" && typeof rawEnd === "string") {
    const start = new Date(rawStart);
    const end = new Date(rawEnd);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end) {
      const s = new Date(start);
      s.setHours(0, 0, 0, 0);
      const e = new Date(end);
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
  }
  const d = new Date();
  const start = new Date(d);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function chat(req: AuthRequest, res: Response) {
  try {
    const rawMessages = req.body.messages;
    const userId = req.userId!;

    const messages = await convertToModelMessages(rawMessages);

    const { start: todayStart, end: todayEnd } = getTodayRange(req);
    const { start: weekStart, end: weekEnd } = getWeekRange(req);

    const todayEntries = await FoodEntry.find({
      userId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: todayStart, $lte: todayEnd },
    }).lean();

    console.log("[chat] today range:", todayStart.toLocaleString(), "to", todayEnd.toLocaleString(), "entries:", todayEntries.length);

    // Fetch user context for the system prompt
    const currentGoal = await Goal.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      endDate: null,
    })
      .sort({ startDate: -1 })
      .lean();

    const todayTotals = todayEntries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + (e.macros?.protein || 0),
        carbs: acc.carbs + (e.macros?.carbs || 0),
        fats: acc.fats + (e.macros?.fats || 0),
        count: acc.count + 1,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, count: 0 },
    );

    const byMeal: Record<string, typeof todayEntries> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const e of todayEntries) {
      if (byMeal[e.mealType]) byMeal[e.mealType].push(e);
    }
    const todayByMealStr = ["breakfast", "lunch", "dinner", "snack"]
      .map((m) => {
        const items = byMeal[m] || [];
        return items.length ? `${m}: ${items.map((e) => `${e.foodName} (${e.calories} kcal)`).join(", ")}` : `${m}: —`;
      })
      .join(" · ") || "None yet";

    const systemPrompt = `You are NutriTrack AI, a friendly and knowledgeable nutrition assistant inside a calorie tracking app.

CURRENT USER CONTEXT:
- Today's intake: ${todayTotals.calories} kcal, ${todayTotals.protein}g protein, ${todayTotals.carbs}g carbs, ${todayTotals.fats}g fats (${todayTotals.count} entries)
- Goals: ${currentGoal ? `${currentGoal.calorieTarget} kcal, ${currentGoal.proteinTarget}g protein, ${currentGoal.carbsTarget}g carbs, ${currentGoal.fatTarget}g fats` : "No goals set yet"}
- Today's entries by meal: ${todayByMealStr}

CAPABILITIES — use the available tools to:
1. Log meals: When user says they ate something, use logMeal once you have meal type and quantity. Ask for missing info first (see RULES).
2. Edit entries: Use editEntry when user wants to correct a food entry (e.g., "change my lunch to 300 calories"). Call getTodayEntries first to find the entry ID.
3. Delete entries: Use deleteEntry when user wants to remove a food entry (e.g., "delete the banana I logged"). Call getTodayEntries first to find the entry ID.
4. Check today's food: Use getTodayEntries to show what they ate and totals. When the user asks "what did I eat for lunch?", "what was in lunch?", "what was for breakfast/dinner/snack?", answer from "Today's entries by meal" above: list only that meal's items in a short sentence (e.g. "For lunch you had: 2 rotis, dal (450 kcal)."). If that meal has no entries, say "You haven't logged anything for [meal] yet."
5. Past entries: Use getEntriesByDate to look up food logged on a specific date.
6. Weekly summary: When the user asks for a weekly summary or "what I ate this week", call getWeeklySummary. It returns daily totals, averages, targets, and an entries list (date, mealType, foodName, calories). Summarize averages/targets, then list what they ate by date and meal (Breakfast, Lunch, Dinner, Snack for each day).
7. Goal management: Use getCurrentGoals to check goals, updateGoal to change them, or deleteGoal to remove goals.
8. Nutrition questions: When the user asks about calories in a food, whether something is healthy, protein/carb sources, or diet tips, answer from your knowledge in 2-4 clear sentences. Do not use any tool — just reply with helpful nutrition info.

RULES:
- Be concise — 2-3 sentences max unless the user asks for detail.
- When the user wants to log food: (1) If they did not say which meal (breakfast, lunch, dinner, or snack), ask once: "Which meal was this for — breakfast, lunch, dinner, or snack?" and wait for their reply. (2) If quantity is not clear (e.g. they said "I had dal" or "ate rice" without "1 cup", "2 rotis", "half plate"), ask once: "How much did you have? (e.g. 1 cup, 2 rotis, 1 bowl)" and wait for their reply. (3) Only call logMeal when you have both meal type and quantity (or a clear default like "1 serving"). Then estimate calories/macros and call logMeal; confirm in one short sentence what you logged.
- Never output raw tool call JSON in your messages. Use tools via the API only; reply in natural language only.
- When logging food, estimate realistic calories/macros for Indian, Asian, Western cuisines. After logging, mention calories added and daily total.
- Use encouraging, supportive tone. Celebrate when they're on track.
- If unsure about a food's nutrition, give your best estimate and mention it's approximate.
- For edits and deletes, ALWAYS call getTodayEntries (or getEntriesByDate) first to get the entry ID. Never guess an ID.
- Confirm with the user what was deleted or edited.
- Weekly summary: Always call getWeeklySummary when the user asks for a weekly summary, "what I ate this week", or "how was my week". The tool returns entries (date, mealType, foodName, calories). In your reply: (1) Give a short line on average intake and goals if set. (2) Then list what they ate: for each date (e.g. "Feb 17"), list items by meal — Breakfast: ... Lunch: ... Dinner: ... Snack: ... Use the entries array; group by date then by meal. If a meal has no entries that day, you can omit it or say "—". Use friendly date format (e.g. "Mon Feb 17" or "Feb 17").
- Nutrition Q&A: For questions like "how many calories in X", "is Y healthy", "good sources of protein", answer directly in a few sentences. No tool call needed.
- "What did I eat for [meal]?" / "What was in lunch?" etc.: Answer from "Today's entries by meal" in context. List only that meal's items (e.g. "For lunch you had: 2 rotis, dal (450 kcal)."). If none, say they haven't logged that meal yet.`;

    const chatModel = process.env.OLLAMA_CHAT_MODEL || "llama3.2:3b";

    const result = streamText({
      model: ollama(chatModel),
      system: systemPrompt,
      messages,
      tools: {
        logMeal: tool({
          description:
            "Log a food entry. Only call when you have both meal type (breakfast/lunch/dinner/snack) and quantity from the user. If they did not say which meal or how much, ask them first in chat, then call logMeal in a follow-up. Estimate calories and macros.",
          inputSchema: z.object({
            foodName: z.string().describe("Name of the food item"),
            mealType: z
              .enum(["breakfast", "lunch", "dinner", "snack"])
              .describe("Type of meal"),
            calories: z.coerce.number().min(0).describe("Estimated calories"),
            protein: z.coerce.number().min(0).describe("Protein in grams"),
            carbs: z.coerce.number().min(0).describe("Carbs in grams"),
            fats: z.coerce.number().min(0).describe("Fats in grams"),
            quantity: z.coerce.number().min(0).describe("Quantity consumed"),
            unit: z
              .string()
              .describe(
                "Unit of measurement (serving, piece, cup, bowl, plate, g, etc.)",
              ),
          }),
          execute: async ({
            foodName,
            mealType,
            calories,
            protein,
            carbs,
            fats,
            quantity,
            unit,
          }) => {
            try {
              console.log("[logMeal] Called with:", { foodName, mealType, calories, userId });
              const entry = await FoodEntry.create({
                userId: new mongoose.Types.ObjectId(userId),
                mealType,
                foodName: String(foodName).trim(),
                quantity: Number(quantity) >= 0 ? Number(quantity) : 1,
                unit: String(unit).trim() || "serving",
                calories: Number(calories) >= 0 ? Number(calories) : 0,
                macros: {
                  protein: Number(protein) >= 0 ? Number(protein) : 0,
                  carbs: Number(carbs) >= 0 ? Number(carbs) : 0,
                  fats: Number(fats) >= 0 ? Number(fats) : 0,
                },
                source: "ai",
                timestamp: new Date(),
              });
              console.log("[logMeal] Created entry:", entry._id.toString());

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
                { calories: 0, protein: 0, carbs: 0, fats: 0 },
              );

              return {
                success: true,
                entryId: entry._id,
                logged: {
                  foodName: entry.foodName,
                  mealType: entry.mealType,
                  calories: entry.calories,
                  protein: entry.macros?.protein ?? 0,
                  carbs: entry.macros?.carbs ?? 0,
                  fats: entry.macros?.fats ?? 0,
                  quantity: entry.quantity,
                  unit: entry.unit,
                },
                dailyTotals: newTotals,
                goalTarget: currentGoal?.calorieTarget || null,
              };
            } catch (err: any) {
              console.error("[logMeal] Error:", err?.message ?? err);
              return {
                success: false,
                error: err?.message ?? "Failed to save entry",
              };
            }
          },
        }),

        getTodayEntries: tool({
          description:
            "Get all food entries for today with totals. Use when user asks what they ate or their current intake.",
          inputSchema: z.object({}),
          execute: async () => {
            const entries = await FoodEntry.find({
              userId: new mongoose.Types.ObjectId(userId),
              timestamp: { $gte: todayStart, $lte: todayEnd },
            })
              .sort({ timestamp: 1 })
              .lean();

            const totals = entries.reduce(
              (acc, e) => ({
                calories: acc.calories + e.calories,
                protein: acc.protein + (e.macros?.protein || 0),
                carbs: acc.carbs + (e.macros?.carbs || 0),
                fats: acc.fats + (e.macros?.fats || 0),
              }),
              { calories: 0, protein: 0, carbs: 0, fats: 0 },
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
              goal: currentGoal
                ? {
                    calories: currentGoal.calorieTarget,
                    protein: currentGoal.proteinTarget,
                    carbs: currentGoal.carbsTarget,
                    fats: currentGoal.fatTarget,
                  }
                : null,
              remaining: currentGoal
                ? {
                    calories: currentGoal.calorieTarget - totals.calories,
                    protein: currentGoal.proteinTarget - totals.protein,
                    carbs: currentGoal.carbsTarget - totals.carbs,
                    fats: currentGoal.fatTarget - totals.fats,
                  }
                : null,
            };
          },
        }),

        getWeeklySummary: tool({
          description:
            "Get the user's 7-day nutrition summary: daily totals, weekly averages, goals, and a list of what they ate each day by meal (breakfast/lunch/dinner/snack). Call this when the user asks for a weekly summary, 'how did I do this week', or what they ate in the week.",
          inputSchema: z.object({}),
          execute: async () => {
            const [weekly, goalVsActual, weekEntries] = await Promise.all([
              getWeeklyCalories(userId, weekStart, weekEnd),
              getGoalVsActual(userId, weekStart, weekEnd),
              FoodEntry.find({
                userId: new mongoose.Types.ObjectId(userId),
                timestamp: { $gte: weekStart, $lte: weekEnd },
              })
                .sort({ timestamp: 1 })
                .lean(),
            ]);

            const entriesByDateAndMeal = weekEntries.map((e) => ({
              date: e.timestamp instanceof Date ? e.timestamp.toISOString().slice(0, 10) : String(e.timestamp).slice(0, 10),
              mealType: e.mealType,
              foodName: e.foodName,
              calories: e.calories,
            }));

            return {
              daily: weekly,
              averages: goalVsActual.averages,
              targets: goalVsActual.targets,
              entries: entriesByDateAndMeal,
            };
          },
        }),

        getCurrentGoals: tool({
          description:
            "Get the user's current nutrition goals. Use when they ask about their targets.",
          inputSchema: z.object({}),
          execute: async () => {
            const goal = await Goal.findOne({
              userId: new mongoose.Types.ObjectId(userId),
              endDate: null,
            })
              .sort({ startDate: -1 })
              .lean();

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
          description:
            "Update the user's nutrition goal. Use when they want to change a target. Set 0 for targets they don't want to track.",
          inputSchema: z.object({
            calorieTarget: z
              .number()
              .describe("Daily calorie target (0 if not tracking)"),
            proteinTarget: z
              .number()
              .describe("Daily protein target in grams (0 if not tracking)"),
            carbsTarget: z
              .number()
              .describe("Daily carbs target in grams (0 if not tracking)"),
            fatTarget: z
              .number()
              .describe("Daily fat target in grams (0 if not tracking)"),
            weightGoal: z
              .number()
              .nullable()
              .describe("Target weight in kg, or null"),
          }),
          execute: async ({
            calorieTarget,
            proteinTarget,
            carbsTarget,
            fatTarget,
            weightGoal,
          }) => {
            await Goal.updateMany(
              { userId: new mongoose.Types.ObjectId(userId), endDate: null },
              { endDate: new Date() },
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
              goals: {
                calorieTarget,
                proteinTarget,
                carbsTarget,
                fatTarget,
                weightGoal,
              },
            };
          },
        }),

        editEntry: tool({
          description:
            "Edit an existing food entry. Use getTodayEntries first to get the entry ID. Only update fields the user mentioned — keep others unchanged.",
          inputSchema: z.object({
            entryId: z.string().describe("The _id of the food entry to edit"),
            foodName: z
              .string()
              .optional()
              .describe("New food name, if changing"),
            mealType: z
              .enum(["breakfast", "lunch", "dinner", "snack"])
              .optional()
              .describe("New meal type, if changing"),
            calories: z
              .number()
              .optional()
              .describe("New calorie count, if changing"),
            protein: z
              .number()
              .optional()
              .describe("New protein in grams, if changing"),
            carbs: z
              .number()
              .optional()
              .describe("New carbs in grams, if changing"),
            fats: z
              .number()
              .optional()
              .describe("New fats in grams, if changing"),
            quantity: z
              .number()
              .optional()
              .describe("New quantity, if changing"),
            unit: z.string().optional().describe("New unit, if changing"),
          }),
          execute: async ({
            entryId,
            foodName,
            mealType,
            calories,
            protein,
            carbs,
            fats,
            quantity,
            unit,
          }) => {
            const update: any = {};
            if (foodName !== undefined) update.foodName = foodName;
            if (mealType !== undefined) update.mealType = mealType;
            if (calories !== undefined) update.calories = calories;
            if (quantity !== undefined) update.quantity = quantity;
            if (unit !== undefined) update.unit = unit;
            if (
              protein !== undefined ||
              carbs !== undefined ||
              fats !== undefined
            ) {
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
              { new: true },
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
          description:
            "Delete a food entry. Use getTodayEntries first to find the entry ID. Confirm what was deleted.",
          inputSchema: z.object({
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
          description:
            "Delete the user's active goal. Use when user wants to remove/clear their goals.",
          inputSchema: z.object({}),
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
          description:
            "Get food entries for a specific date (not today). Use when user asks about a past day, e.g. 'what did I eat yesterday'.",
          inputSchema: z.object({
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
            })
              .sort({ timestamp: 1 })
              .lean();

            const totals = entries.reduce(
              (acc, e) => ({
                calories: acc.calories + e.calories,
                protein: acc.protein + (e.macros?.protein || 0),
                carbs: acc.carbs + (e.macros?.carbs || 0),
                fats: acc.fats + (e.macros?.fats || 0),
              }),
              { calories: 0, protein: 0, carbs: 0, fats: 0 },
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
      stopWhen: stepCountIs(8),
    });

    result.pipeUIMessageStreamToResponse(res);
  } catch (err: any) {
    console.error("Chat error:", err);
    const isQuota =
      err?.statusCode === 429 ||
      err?.lastError?.statusCode === 429 ||
      err?.message?.includes("quota") ||
      err?.message?.includes("RESOURCE_EXHAUSTED");

    if (!res.headersSent) {
      res.status(isQuota ? 429 : 500).json({
        error: isQuota
          ? "AI service is temporarily unavailable due to rate limits. Please try again in a minute."
          : "AI server is unreachable at the moment. Please try again later.",
      });
    }
  }
}

export async function getChatHistory(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
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
