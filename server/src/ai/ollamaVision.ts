const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || "qwen3-vl:8b";
const TEXT_MODEL = process.env.OLLAMA_TEXT_MODEL || "llama3.2:3b";
const VISION_TIMEOUT_MS = 90_000; // 90s for vision (short prompt, one-line reply)
const TEXT_TIMEOUT_MS = 30_000;   // 30s for text estimation

async function checkOllamaConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/version`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = (await res.json()) as { version?: string };
      console.log(`[Ollama] Connection OK at ${OLLAMA_BASE}, version: ${data.version ?? "unknown"}`);
      return true;
    }
    console.warn(`[Ollama] Connection check failed: ${res.status} ${await res.text()}`);
    return false;
  } catch (err) {
    console.warn("[Ollama] Connection failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

/** Step 1: Vision model only identifies food name(s) from image. Short prompt = faster. */
async function getFoodNamesFromImage(imageUrl: string): Promise<string> {
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const base64Image = imageBuffer.toString("base64");

  const prompt = `What food or foods are in this image? If it's a nutrition label or package, give the product/food name. Reply with ONLY a comma-separated list of food names, nothing else. No explanation.`;

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        { role: "user", content: prompt, images: [base64Image] },
      ],
      stream: false,
    }),
    signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama vision error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  const text = (data.message?.content ?? "").trim();
  const result = text || "unknown food";

  console.log("\n--- [Vision] Step 1: Food names from image ---");
  console.log("  Model:", VISION_MODEL);
  console.log("  Returned:", result);
  console.log("----------------------------------------------\n");

  return result;
}

/** Coerce numeric fields from LLM output (sometimes returns strings e.g. "1 piece (...)"). */
function normalizeExtraction(result: {
  foods?: Array<Record<string, unknown>>;
  confidence?: unknown;
  rawText?: string;
}): { foods: Array<{ name: string; calories: number; protein: number; carbs: number; fats: number; quantity: number; unit: string }>; confidence: number; rawText: string } {
  const toNum = (v: unknown, def: number): number => {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string") {
      const parsed = parseFloat(v.replace(/^(\d+(?:\.\d+)?).*$/, "$1").trim() || String(def));
      return Number.isNaN(parsed) ? def : parsed;
    }
    return def;
  };
  const foods = (result.foods ?? []).map((f: Record<string, unknown>) => ({
    name: typeof f.name === "string" ? f.name : "Unknown",
    calories: toNum(f.calories, 0),
    protein: toNum(f.protein, 0),
    carbs: toNum(f.carbs, 0),
    fats: toNum(f.fats, 0),
    quantity: toNum(f.quantity, 1),
    unit: typeof f.unit === "string" ? f.unit : "serving",
  }));
  return {
    foods,
    confidence: toNum(result.confidence, 0.5),
    rawText: typeof result.rawText === "string" ? result.rawText : "",
  };
}

/** Step 2: Text model estimates calories and macros from food names. No image = fast. */
async function estimateNutritionFromFoodNames(foodNames: string): Promise<{
  foods: Array<{ name: string; calories: number; protein: number; carbs: number; fats: number; quantity: number; unit: string }>;
  confidence: number;
  rawText: string;
}> {
  const prompt = `You are a nutrition expert. For the following food(s), estimate nutritional info per typical serving.

Food(s): ${foodNames}

You MUST respond with ONLY a single valid JSON object. No markdown, no code fences, no extra text.

STRICT RULES:
- Every numeric field MUST be a JSON number: use digits and optional decimal point only (e.g. 120, 2.5, 1, 0.9). Do NOT use fractions like 1/8. Do NOT put units inside numbers (e.g. use 100 not 100g).
- "quantity" must be a number (e.g. 1 or 100). "unit" must be a string (e.g. "piece", "gram", "serving", "cup").
- "confidence" must be a number between 0 and 1 (e.g. 0.9).
- "rawText" must be a string: a brief one-line description of the food(s).

Required JSON shape exactly:
{"foods":[{"name":"string","calories":number,"protein":number,"carbs":number,"fats":number,"quantity":number,"unit":"string"}],"confidence":number,"rawText":"string"}

If multiple foods, add one object per food to the "foods" array. Use realistic estimates for Indian, Asian, Western foods.`;

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    }),
    signal: AbortSignal.timeout(TEXT_TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama text error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  const text = data.message?.content ?? "";

  let cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // Fix invalid JSON: model sometimes returns fractions like "quantity": 1/8 → use decimal
  cleaned = cleaned.replace(/"quantity":\s*(\d+)\/(\d+)/g, (_, a, b) => `"quantity": ${Number(a) / Number(b)}`);
  cleaned = cleaned.replace(/"calories":\s*(\d+)\/(\d+)/g, (_, a, b) => `"calories": ${Number(a) / Number(b)}`);
  cleaned = cleaned.replace(/"protein":\s*(\d+)\/(\d+)/g, (_, a, b) => `"protein": ${Number(a) / Number(b)}`);
  cleaned = cleaned.replace(/"carbs":\s*(\d+)\/(\d+)/g, (_, a, b) => `"carbs": ${Number(a) / Number(b)}`);
  cleaned = cleaned.replace(/"fats":\s*(\d+)\/(\d+)/g, (_, a, b) => `"fats": ${Number(a) / Number(b)}`);
  cleaned = cleaned.replace(/"confidence":\s*(\d+)\/(\d+)/g, (_, a, b) => `"confidence": ${Number(a) / Number(b)}`);

  // Fix "quantity": 100g or "quantity": 50ml etc → "quantity": 100 (number only)
  cleaned = cleaned.replace(/"quantity":\s*(\d+(?:\.\d+)?)\s*(?:g|ml|kg|oz|lb)?/gi, (_, n) => `"quantity": ${n}`);

  const tryParse = (str: string): ReturnType<typeof normalizeExtraction> | null => {
    try {
      const parsed = JSON.parse(str);
      return normalizeExtraction(parsed);
    } catch {
      return null;
    }
  };

  let out = tryParse(cleaned);
  if (out) {

    console.log("\n--- [Vision] Step 2: Nutrition estimation ---");
    console.log("  Model:", TEXT_MODEL);
    console.log("  Input (food names):", foodNames);
    console.log("  Confidence:", (out.confidence * 100).toFixed(0) + "%");
    console.log("  Description:", out.rawText || "(none)");
    console.log("  Foods:");
    out.foods.forEach((f, i) => {
      console.log(`    ${i + 1}. ${f.name}: ${f.calories} kcal, P ${f.protein}g C ${f.carbs}g F ${f.fats}g (${f.quantity} ${f.unit})`);
    });
    console.log("-------------------------------------------\n");

    return out;
  }

  // Fallback: try to extract JSON from raw response (e.g. wrapped in markdown or extra text)
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    let extracted = text.slice(firstBrace, lastBrace + 1);
    extracted = extracted
      .replace(/"quantity":\s*(\d+)\/(\d+)/g, (_, a, b) => `"quantity": ${Number(a) / Number(b)}`)
      .replace(/"quantity":\s*(\d+(?:\.\d+)?)\s*(?:g|ml|kg|oz|lb)?/gi, (_, n) => `"quantity": ${n}`)
      .replace(/"calories":\s*(\d+)\/(\d+)/g, (_, a, b) => `"calories": ${Number(a) / Number(b)}`)
      .replace(/"protein":\s*(\d+)\/(\d+)/g, (_, a, b) => `"protein": ${Number(a) / Number(b)}`)
      .replace(/"carbs":\s*(\d+)\/(\d+)/g, (_, a, b) => `"carbs": ${Number(a) / Number(b)}`)
      .replace(/"fats":\s*(\d+)\/(\d+)/g, (_, a, b) => `"fats": ${Number(a) / Number(b)}`)
      .replace(/"confidence":\s*(\d+)\/(\d+)/g, (_, a, b) => `"confidence": ${Number(a) / Number(b)}`);
    out = tryParse(extracted);
    if (out?.foods?.length) {
      console.log("[Vision] Step 2: Recovered from raw response (fallback parse).");
      return out;
    }
  }

  console.log("\n--- [Vision] Step 2: Parse failed ---");
  console.log("  Raw response (first 200 chars):", (text || foodNames).slice(0, 200));
  console.log("---------------------------------\n");
  // Always return exact format: parsing is backend-only; frontend expects foods[], confidence, rawText
  return {
    foods: [],
    confidence: 0,
    rawText: "Could not parse nutrition from response.",
  };
}

export async function extractNutritionFromImage(imageUrl: string) {
  const connected = await checkOllamaConnection();
  if (!connected) {
    throw new Error("Cannot reach Ollama. Is it running at " + OLLAMA_BASE + "?");
  }

  console.log("\n========== [Vision] Image nutrition extraction ==========");
  console.log("  Step 1: Asking vision model for food names...");

  const foodNames = await getFoodNamesFromImage(imageUrl);

  if (!foodNames || foodNames.toLowerCase().includes("cannot") || foodNames.length < 2) {
    console.log("  → No food identified. Skipping Step 2.");
    console.log("========================================================\n");
    return {
      foods: [],
      confidence: 0.1,
      rawText: "Could not identify food from image.",
    };
  }

  console.log("  Step 2: Asking text model to estimate nutrition...");
  const result = await estimateNutritionFromFoodNames(foodNames);
  console.log("========================================================\n");
  return result;
}
