import { ChatOllama } from "@langchain/ollama";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || "qwen3-vl:8b";
const TEXT_MODEL = process.env.OLLAMA_TEXT_MODEL || "qwen2.5:7b";
const VISION_TIMEOUT_MS = 90_000;
const TEXT_TIMEOUT_MS = 30_000;

async function checkOllamaConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/version`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = (await res.json()) as { version?: string };
      console.log(`[Ollama] Connection OK at ${OLLAMA_BASE}, version: ${data.version ?? "unknown"}`);
      return true;
    }
    console.warn(`[Ollama] Connection check failed: ${res.status}`);
    return false;
  } catch (err) {
    console.warn("[Ollama] Connection failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

const NutritionSchema = z.object({
  foods: z.array(
    z.object({
      name: z.string(),
      calories: z.coerce.number(),
      protein: z.coerce.number(),
      carbs: z.coerce.number(),
      fats: z.coerce.number(),
      quantity: z.coerce.number(),
      unit: z.string(),
    }),
  ),
  confidence: z.coerce.number(),
  rawText: z.string(),
});

/**
 * Cloudinary delivers resized derivatives via URL transforms. Shrinking the image
 * to ~768px (and auto quality/format) before vision inference is a large speedup —
 * the model processes far fewer pixels — with no loss for "name the food" accuracy.
 */
function downscaledImageUrl(url: string): string {
  return url.includes("/upload/")
    ? url.replace("/upload/", "/upload/w_768,c_limit,q_auto,f_auto/")
    : url;
}

/** Stage 1: vision model returns comma-separated food names. */
async function getFoodNamesFromImage(imageUrl: string): Promise<string> {
  const imageResponse = await fetch(downscaledImageUrl(imageUrl));
  const base64Image = Buffer.from(await imageResponse.arrayBuffer()).toString("base64");

  const vision = new ChatOllama({ model: VISION_MODEL, baseUrl: OLLAMA_BASE });
  const res = await vision.invoke(
    [
      new HumanMessage({
        content: [
          {
            type: "text",
            text: "What food or foods are in this image? If it's a nutrition label or package, give the product/food name. Reply with ONLY a comma-separated list of food names, nothing else.",
          },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
        ],
      }),
    ],
    { signal: AbortSignal.timeout(VISION_TIMEOUT_MS) },
  );

  const text = (typeof res.content === "string" ? res.content : "").trim();
  const result = text || "unknown food";
  console.log("[Vision] Step 1 food names:", result);
  return result;
}

const EMPTY_NUTRITION = {
  foods: [] as z.infer<typeof NutritionSchema>["foods"],
  confidence: 0,
  rawText: "Could not parse nutrition from response.",
};

/** Stage 2: text model estimates nutrition as a schema-validated object. */
async function estimateNutritionFromFoodNames(foodNames: string) {
  const model = new ChatOllama({ model: TEXT_MODEL, baseUrl: OLLAMA_BASE }).withStructuredOutput(
    NutritionSchema,
    { method: "jsonSchema" },
  );
  const prompt = `You are a nutrition expert. For the following food(s), estimate nutritional info per typical serving. Use realistic estimates for Indian, Asian, Western foods. One object per food in "foods". confidence is 0..1. rawText is a brief one-line description.

Food(s): ${foodNames}`;

  try {
    const raw = await model.invoke(prompt, { signal: AbortSignal.timeout(TEXT_TIMEOUT_MS) });
    const parsed = NutritionSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn("[Vision] Step 2 schema validation failed:", parsed.error.message);
      return EMPTY_NUTRITION;
    }
    const out = parsed.data;
    console.log(
      `[Vision] Step 2: ${out.foods.length} food(s), confidence ${(out.confidence * 100).toFixed(0)}%`,
    );
    return out;
  } catch (err) {
    console.warn("[Vision] Step 2 structured output failed:", err instanceof Error ? err.message : err);
    return EMPTY_NUTRITION;
  }
}

export async function extractNutritionFromImage(imageUrl: string) {
  const connected = await checkOllamaConnection();
  if (!connected) throw new Error("Cannot reach Ollama. Is it running at " + OLLAMA_BASE + "?");

  const foodNames = await getFoodNamesFromImage(imageUrl);
  if (!foodNames || foodNames.toLowerCase().includes("cannot") || foodNames.length < 2) {
    return { foods: [], confidence: 0.1, rawText: "Could not identify food from image." };
  }
  return estimateNutritionFromFoodNames(foodNames);
}
