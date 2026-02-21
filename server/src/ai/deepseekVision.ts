const DEEPSEEK_BASE = process.env.DEEPSEEK_API_BASE || "https://api.deepseek.com";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_VISION_MODEL || "deepseek-vision";
const TIMEOUT_MS = 60_000;

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) {
    throw new Error("DEEPSEEK_API_KEY is not set. Add it to your .env file.");
  }
  return key;
}

export async function extractNutritionFromImage(imageUrl: string) {
  const apiKey = getApiKey();
  console.log("[DeepSeek] Using vision API at", DEEPSEEK_BASE, "model:", DEEPSEEK_MODEL);

  const imageResponse = await fetch(imageUrl);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const base64Image = imageBuffer.toString("base64");

  const prompt = `Analyze this image of food or a nutrition label. Extract nutritional information and return ONLY a valid JSON object in this exact format:
{
  "foods": [
    {
      "name": "food item name",
      "calories": <number>,
      "protein": <number in grams>,
      "carbs": <number in grams>,
      "fats": <number in grams>,
      "quantity": <number>,
      "unit": "serving/piece/cup/gram/oz/etc"
    }
  ],
  "confidence": <number between 0 and 1>,
  "rawText": "any text visible on a nutrition label, or brief description of the food"
}

If this is a nutrition label, extract the exact values shown.
If this is a photo of food, estimate the nutritional content as accurately as possible.
If you cannot identify the food, set confidence to 0.1 and provide your best guess.
Return ONLY the JSON, no other text.`;

  const url = `${DEEPSEEK_BASE.replace(/\/$/, "")}/v1/vision`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      image: base64Image,
      prompt,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[DeepSeek] API error:", res.status, err);
    throw new Error(`DeepSeek vision error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { content?: string; text?: string; choices?: Array<{ message?: { content?: string } }> };
  const text =
    data.content ??
    data.text ??
    data.choices?.[0]?.message?.content ??
    "";

  const cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      foods: [],
      confidence: 0,
      rawText: text,
    };
  }
}
