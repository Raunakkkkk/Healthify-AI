import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { type ChatContext, createTools, buildAgent, buildSystemPrompt } from "../ai/agent.js";
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
  const userId = req.userId!;

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

  const ctx: ChatContext = { userId, todayStart, todayEnd, weekStart, weekEnd, currentGoal };
  const tools = createTools(ctx);
  const app = buildAgent(tools);
  const systemPrompt = buildSystemPrompt(ctx, todayByMealStr, todayTotals);

  const incoming: Array<{ role: string; content: string }> = Array.isArray(req.body.messages)
    ? req.body.messages
    : [];
  const lcMessages = incoming.map((m) =>
    m.role === "assistant" ? new AIMessage(m.content) : new HumanMessage(m.content),
  );
  const inputMessages = [new SystemMessage(systemPrompt), ...lcMessages];
  const latestUserText = [...incoming].reverse().find((m) => m.role === "user")?.content ?? "";

  if (latestUserText) {
    await ChatMessage.create({
      userId, role: "user", content: latestUserText,
      parts: [{ type: "text", text: latestUserText }],
    });
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  const send = (obj: unknown) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  const parts: Array<
    | { type: "text"; text: string }
    | { type: "tool"; name: string; output: Record<string, unknown> }
  > = [];
  let textBuf = "";
  const entriesCreated: string[] = [];
  let actionTaken: string | undefined;
  const flushText = () => { if (textBuf) { parts.push({ type: "text", text: textBuf }); textBuf = ""; } };

  try {
    const stream = app.streamEvents(
      { messages: inputMessages },
      { version: "v2", recursionLimit: 16 },
    );
    for await (const ev of stream) {
      if (ev.event === "on_chat_model_stream") {
        const chunk: any = ev.data?.chunk;
        const text = typeof chunk?.content === "string" ? chunk.content : "";
        if (text) { textBuf += text; send({ type: "text-delta", delta: text }); }
      } else if (ev.event === "on_tool_end") {
        const name = ev.name as string;
        let output: any = ev.data?.output;
        if (output && typeof output === "object" && "content" in output) output = output.content;
        if (typeof output === "string") { try { output = JSON.parse(output); } catch { /* leave */ } }
        const outObj = (output && typeof output === "object") ? output : { value: output };
        flushText();
        parts.push({ type: "tool", name, output: outObj });
        send({ type: "tool-result", name, output: outObj });
        if (name === "logMeal" && outObj?.success && outObj?.entryId) {
          entriesCreated.push(String(outObj.entryId)); actionTaken = "entries_created";
        } else if (["editEntry","deleteEntry","updateGoal","deleteGoal"].includes(name) && outObj?.success) {
          actionTaken = actionTaken ?? name;
        }
      }
    }
    flushText();
    send({ type: "done" });
    const fullText = parts.filter((p) => p.type === "text").map((p: any) => p.text).join("");
    await ChatMessage.create({
      userId, role: "assistant", content: fullText, parts,
      metadata: {
        ...(actionTaken ? { actionTaken } : {}),
        ...(entriesCreated.length ? { entriesCreated } : {}),
      },
    });
    res.end();
  } catch (err: any) {
    console.error("Chat error:", err);
    const isQuota = err?.statusCode === 429 || err?.message?.includes("quota") || err?.message?.includes("RESOURCE_EXHAUSTED");
    if (!res.headersSent) {
      res.status(isQuota ? 429 : 500).json({
        error: isQuota
          ? "AI service is temporarily unavailable due to rate limits. Please try again in a minute."
          : "AI server is unreachable at the moment. Please try again later.",
      });
    } else {
      send({ type: "error", message: "AI stream failed. Please try again." });
      res.end();
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
