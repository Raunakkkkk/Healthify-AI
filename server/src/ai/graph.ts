import { GoogleGenerativeAI } from "@google/generative-ai";
import FoodEntry from "../models/FoodEntry.js";
import Goal from "../models/Goal.js";
import {
  INTENT_CLASSIFICATION_PROMPT,
  LOG_FOOD_PROMPT,
  QUERY_STATS_PROMPT,
  GENERAL_QA_PROMPT,
} from "./prompts.js";
import { getWeeklyCalories, getGoalVsActual } from "../services/reportService.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

function parseJSON(text: string) {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

interface ChatHistory {
  role: string;
  content: string;
}

interface GraphResult {
  response: string;
  intent: string;
  actionTaken?: string;
  entriesCreated?: string[];
  data?: any;
}

// Node 1: Classify intent
async function classifyIntent(message: string, history: ChatHistory[]) {
  const historyContext = history
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const prompt = `${INTENT_CLASSIFICATION_PROMPT}

Recent conversation:
${historyContext}

Current message: ${message}`;

  const result = await model.generateContent(prompt);
  return parseJSON(result.response.text()) || { intent: "general_qa", entities: {} };
}

// Node 2: Log food
async function logFood(
  userId: string,
  message: string,
  entities: any
): Promise<GraphResult> {
  const mealContext = entities.mealType
    ? `The meal type is ${entities.mealType}.`
    : "";

  const prompt = `${LOG_FOOD_PROMPT}\n\n${mealContext}\n\nUser said: "${message}"`;
  const result = await model.generateContent(prompt);
  const parsed = parseJSON(result.response.text());

  if (!parsed || !parsed.entries?.length) {
    return {
      response: "I couldn't understand the food items. Could you describe them again?",
      intent: "log_food",
    };
  }

  const createdIds: string[] = [];
  for (const entry of parsed.entries) {
    const created = await FoodEntry.create({
      userId,
      mealType: entry.mealType || entities.mealType || "snack",
      foodName: entry.foodName,
      quantity: entry.quantity || 1,
      unit: entry.unit || "serving",
      calories: entry.calories || 0,
      macros: entry.macros || { protein: 0, carbs: 0, fats: 0 },
      source: "ai",
      timestamp: new Date(),
    });
    createdIds.push(created._id as string);
  }

  const totalCals = parsed.entries.reduce(
    (sum: number, e: any) => sum + (e.calories || 0),
    0
  );

  return {
    response:
      parsed.summary ||
      `Logged ${parsed.entries.length} item(s) totaling ${totalCals} calories.`,
    intent: "log_food",
    actionTaken: "entries_created",
    entriesCreated: createdIds,
    data: parsed.entries,
  };
}

// Node 3: Query stats
async function queryStats(
  userId: string,
  message: string,
  entities: any
): Promise<GraphResult> {
  let data: any;

  try {
    if (
      entities.dateRange === "this_week" ||
      entities.dateRange === "last_week"
    ) {
      data = await getGoalVsActual(userId);
    } else {
      // Default to today/recent
      data = await getWeeklyCalories(userId);
    }
  } catch {
    data = { message: "No data available yet" };
  }

  const goal = await Goal.findOne({
    userId,
    endDate: null,
  }).sort({ startDate: -1 });

  const prompt = `${QUERY_STATS_PROMPT}

User's question: "${message}"

Nutrition data: ${JSON.stringify(data)}
${goal ? `Current goals: Calories: ${goal.calorieTarget}, Protein: ${goal.proteinTarget}g, Carbs: ${goal.carbsTarget}g, Fats: ${goal.fatTarget}g` : "No goals set yet."}`;

  const result = await model.generateContent(prompt);

  return {
    response: result.response.text(),
    intent: "query_stats",
    data,
  };
}

// Node 4: Update goal
async function updateGoal(
  userId: string,
  message: string,
  entities: any
): Promise<GraphResult> {
  const goals = entities.goals || {};

  if (!goals.calorieTarget && !goals.proteinTarget && !goals.carbsTarget && !goals.fatTarget) {
    // Ask Gemini to extract goal values from the message
    const prompt = `Extract nutrition goals from this message. Return JSON: {"calorieTarget": <number|null>, "proteinTarget": <number|null>, "carbsTarget": <number|null>, "fatTarget": <number|null>}

Message: "${message}"`;

    const result = await model.generateContent(prompt);
    const parsed = parseJSON(result.response.text());
    if (parsed) Object.assign(goals, parsed);
  }

  if (!goals.calorieTarget && !goals.proteinTarget) {
    return {
      response:
        "What would you like to set as your target? For example: 'Set my calorie target to 2000 and protein to 120g'",
      intent: "update_goal",
    };
  }

  // Close existing open goals
  await Goal.updateMany({ userId, endDate: null }, { endDate: new Date() });

  const newGoal = await Goal.create({
    userId,
    startDate: new Date(),
    calorieTarget: goals.calorieTarget || 2000,
    proteinTarget: goals.proteinTarget || 0,
    carbsTarget: goals.carbsTarget || 0,
    fatTarget: goals.fatTarget || 0,
  });

  const parts = [];
  if (newGoal.calorieTarget) parts.push(`${newGoal.calorieTarget} calories`);
  if (newGoal.proteinTarget) parts.push(`${newGoal.proteinTarget}g protein`);
  if (newGoal.carbsTarget) parts.push(`${newGoal.carbsTarget}g carbs`);
  if (newGoal.fatTarget) parts.push(`${newGoal.fatTarget}g fats`);

  return {
    response: `Your daily targets have been updated: ${parts.join(", ")}. Let's hit those goals!`,
    intent: "update_goal",
    actionTaken: "goal_updated",
    data: newGoal,
  };
}

// Node 5: General Q&A
async function generalQA(message: string): Promise<GraphResult> {
  const prompt = `${GENERAL_QA_PROMPT}\n\nUser: ${message}`;
  const result = await model.generateContent(prompt);

  return {
    response: result.response.text(),
    intent: "general_qa",
  };
}

// Main graph runner — routes intent to the appropriate node
export async function runChatGraph(
  userId: string,
  message: string,
  history: ChatHistory[]
): Promise<GraphResult> {
  try {
    // Step 1: Classify intent
    const classification = await classifyIntent(message, history);
    const { intent, entities } = classification;

    // Step 2: Route to the appropriate handler
    switch (intent) {
      case "log_food":
        return await logFood(userId, message, entities || {});
      case "query_stats":
        return await queryStats(userId, message, entities || {});
      case "update_goal":
        return await updateGoal(userId, message, entities || {});
      case "general_qa":
      default:
        return await generalQA(message);
    }
  } catch (err) {
    console.error("Chat graph error:", err);
    return {
      response:
        "I encountered an issue processing your request. Could you try rephrasing that?",
      intent: "error",
    };
  }
}
