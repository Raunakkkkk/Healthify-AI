import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import { extractNutritionFromImage } from "../ai/gemini.js";
import { runChatGraph } from "../ai/graph.js";
import ImageUpload from "../models/ImageUpload.js";
import ChatMessage from "../models/ChatMessage.js";
import { v2 as cloudinary } from "cloudinary";

export async function extractNutrition(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    // Upload to cloudinary
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

export async function chat(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { message } = req.body;
    const userId = req.userId!;

    // Get recent chat history for context
    const history = await ChatMessage.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Save user message
    await ChatMessage.create({ userId, role: "user", content: message });

    const result = await runChatGraph(userId, message, history.reverse());

    // Save assistant response
    await ChatMessage.create({
      userId,
      role: "assistant",
      content: result.response,
      metadata: {
        intent: result.intent,
        actionTaken: result.actionTaken,
        entriesCreated: result.entriesCreated,
      },
    });

    res.json({
      response: result.response,
      intent: result.intent,
      actionTaken: result.actionTaken,
      data: result.data,
    });
  } catch (err) {
    console.error("Chat error:", err);
    next(err);
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
