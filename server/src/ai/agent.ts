import { ChatOllama } from "@langchain/ollama";
import { tool } from "@langchain/core/tools";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { isAIMessage } from "@langchain/core/messages";
import { z } from "zod";
import mongoose from "mongoose";
import FoodEntry from "../models/FoodEntry.js";
import Goal from "../models/Goal.js";
import { getWeeklyCalories, getGoalVsActual } from "../services/reportService.js";

export interface ChatContext {
  userId: string;
  todayStart: Date;
  todayEnd: Date;
  weekStart: Date;
  weekEnd: Date;
  currentGoal: any | null;
}

export function getChatModel(): ChatOllama {
  return new ChatOllama({
    model: process.env.OLLAMA_CHAT_MODEL ?? "qwen2.5:7b",
    baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  });
}

export function buildSystemPrompt(
  ctx: ChatContext,
  todayByMealStr: string,
  todayTotals: { calories: number; protein: number; carbs: number; fats: number; count: number },
): string {
  return `You are NutriTrack AI, a friendly and knowledgeable nutrition assistant inside a calorie tracking app.

CURRENT USER CONTEXT:
- Today's intake: ${todayTotals.calories} kcal, ${todayTotals.protein}g protein, ${todayTotals.carbs}g carbs, ${todayTotals.fats}g fats (${todayTotals.count} entries)
- Goals: ${ctx.currentGoal ? `${ctx.currentGoal.calorieTarget} kcal, ${ctx.currentGoal.proteinTarget}g protein, ${ctx.currentGoal.carbsTarget}g carbs, ${ctx.currentGoal.fatTarget}g fats` : "No goals set yet"}
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
}

export function createTools(ctx: ChatContext): StructuredToolInterface[] {
  const logMeal = tool(
    async ({
      foodName,
      mealType,
      calories,
      protein,
      carbs,
      fats,
      quantity,
      unit,
    }: {
      foodName: string;
      mealType: "breakfast" | "lunch" | "dinner" | "snack";
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      quantity: number;
      unit: string;
    }) => {
      try {
        console.log("[logMeal] Called with:", { foodName, mealType, calories, userId: ctx.userId });
        const entry = await FoodEntry.create({
          userId: new mongoose.Types.ObjectId(ctx.userId),
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
          userId: new mongoose.Types.ObjectId(ctx.userId),
          timestamp: { $gte: ctx.todayStart, $lte: ctx.todayEnd },
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
          goalTarget: ctx.currentGoal?.calorieTarget || null,
        };
      } catch (err: any) {
        console.error("[logMeal] Error:", err?.message ?? err);
        return {
          success: false,
          error: err?.message ?? "Failed to save entry",
        };
      }
    },
    {
      name: "logMeal",
      description:
        "Log a food entry. Only call when you have both meal type (breakfast/lunch/dinner/snack) and quantity from the user. If they did not say which meal or how much, ask them first in chat, then call logMeal in a follow-up. Estimate calories and macros.",
      schema: z.object({
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
    },
  );

  const getTodayEntries = tool(
    async () => {
      const entries = await FoodEntry.find({
        userId: new mongoose.Types.ObjectId(ctx.userId),
        timestamp: { $gte: ctx.todayStart, $lte: ctx.todayEnd },
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
        goal: ctx.currentGoal
          ? {
              calories: ctx.currentGoal.calorieTarget,
              protein: ctx.currentGoal.proteinTarget,
              carbs: ctx.currentGoal.carbsTarget,
              fats: ctx.currentGoal.fatTarget,
            }
          : null,
        remaining: ctx.currentGoal
          ? {
              calories: ctx.currentGoal.calorieTarget - totals.calories,
              protein: ctx.currentGoal.proteinTarget - totals.protein,
              carbs: ctx.currentGoal.carbsTarget - totals.carbs,
              fats: ctx.currentGoal.fatTarget - totals.fats,
            }
          : null,
      };
    },
    {
      name: "getTodayEntries",
      description:
        "Get all food entries for today with totals. Use when user asks what they ate or their current intake.",
      schema: z.object({}),
    },
  );

  const getWeeklySummary = tool(
    async () => {
      const [weekly, goalVsActual, weekEntries] = await Promise.all([
        getWeeklyCalories(ctx.userId, ctx.weekStart, ctx.weekEnd),
        getGoalVsActual(ctx.userId, ctx.weekStart, ctx.weekEnd),
        FoodEntry.find({
          userId: new mongoose.Types.ObjectId(ctx.userId),
          timestamp: { $gte: ctx.weekStart, $lte: ctx.weekEnd },
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
    {
      name: "getWeeklySummary",
      description:
        "Get the user's 7-day nutrition summary: daily totals, weekly averages, goals, and a list of what they ate each day by meal (breakfast/lunch/dinner/snack). Call this when the user asks for a weekly summary, 'how did I do this week', or what they ate in the week.",
      schema: z.object({}),
    },
  );

  const getCurrentGoals = tool(
    async () => {
      const goal = await Goal.findOne({
        userId: new mongoose.Types.ObjectId(ctx.userId),
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
    {
      name: "getCurrentGoals",
      description:
        "Get the user's current nutrition goals. Use when they ask about their targets.",
      schema: z.object({}),
    },
  );

  const updateGoal = tool(
    async ({
      calorieTarget,
      proteinTarget,
      carbsTarget,
      fatTarget,
      weightGoal,
    }: {
      calorieTarget: number;
      proteinTarget: number;
      carbsTarget: number;
      fatTarget: number;
      weightGoal: number | null;
    }) => {
      await Goal.updateMany(
        { userId: new mongoose.Types.ObjectId(ctx.userId), endDate: null },
        { endDate: new Date() },
      );

      await Goal.create({
        userId: new mongoose.Types.ObjectId(ctx.userId),
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
    {
      name: "updateGoal",
      description:
        "Update the user's nutrition goal. Use when they want to change a target. Set 0 for targets they don't want to track.",
      schema: z.object({
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
    },
  );

  const editEntry = tool(
    async ({
      entryId,
      foodName,
      mealType,
      calories,
      protein,
      carbs,
      fats,
      quantity,
      unit,
    }: {
      entryId: string;
      foodName?: string;
      mealType?: "breakfast" | "lunch" | "dinner" | "snack";
      calories?: number;
      protein?: number;
      carbs?: number;
      fats?: number;
      quantity?: number;
      unit?: string;
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
        { _id: entryId, userId: new mongoose.Types.ObjectId(ctx.userId) },
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
    {
      name: "editEntry",
      description:
        "Edit an existing food entry. Use getTodayEntries first to get the entry ID. Only update fields the user mentioned — keep others unchanged.",
      schema: z.object({
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
    },
  );

  const deleteEntry = tool(
    async ({ entryId }: { entryId: string }) => {
      const entry = await FoodEntry.findOneAndDelete({
        _id: entryId,
        userId: new mongoose.Types.ObjectId(ctx.userId),
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
    {
      name: "deleteEntry",
      description:
        "Delete a food entry. Use getTodayEntries first to find the entry ID. Confirm what was deleted.",
      schema: z.object({
        entryId: z.string().describe("The _id of the food entry to delete"),
      }),
    },
  );

  const deleteGoal = tool(
    async () => {
      const result = await Goal.deleteMany({
        userId: new mongoose.Types.ObjectId(ctx.userId),
        endDate: null,
      });

      return {
        success: true,
        deletedCount: result.deletedCount,
      };
    },
    {
      name: "deleteGoal",
      description:
        "Delete the user's active goal. Use when user wants to remove/clear their goals.",
      schema: z.object({}),
    },
  );

  const getEntriesByDate = tool(
    async ({ date }: { date: string }) => {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const entries = await FoodEntry.find({
        userId: new mongoose.Types.ObjectId(ctx.userId),
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
    {
      name: "getEntriesByDate",
      description:
        "Get food entries for a specific date (not today). Use when user asks about a past day, e.g. 'what did I eat yesterday'.",
      schema: z.object({
        date: z.string().describe("Date in YYYY-MM-DD format"),
      }),
    },
  );

  return [
    logMeal,
    getTodayEntries,
    getWeeklySummary,
    getCurrentGoals,
    updateGoal,
    editEntry,
    deleteEntry,
    deleteGoal,
    getEntriesByDate,
  ] as unknown as StructuredToolInterface[];
}

function shouldContinue(state: typeof MessagesAnnotation.State): "tools" | typeof END {
  const last = state.messages[state.messages.length - 1];
  if (isAIMessage(last) && (last.tool_calls?.length ?? 0) > 0) return "tools";
  return END;
}

export function buildAgent(tools: StructuredToolInterface[]) {
  const model = getChatModel().bindTools(tools);
  async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  }
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", new ToolNode(tools))
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, ["tools", END])
    .addEdge("tools", "agent");
  return workflow.compile();
}
