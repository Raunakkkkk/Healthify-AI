import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function extractNutritionFromImage(imageUrl: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const imageResponse = await fetch(imageUrl);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const base64Image = imageBuffer.toString("base64");
  const mimeType = "image/jpeg";

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

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType,
        data: base64Image,
      },
    },
  ]);

  const text = result.response.text();
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

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

export async function geminiChat(prompt: string, context: string = "") {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent(
    context ? `${context}\n\nUser: ${prompt}` : prompt
  );

  return result.response.text();
}
