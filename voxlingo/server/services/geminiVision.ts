import { GoogleGenAI } from "@google/genai";
import { getLanguageNameForPrompt } from "./languageNames";

export interface VisionResult {
  detectedLanguage: string;
  originalText: string;
  translatedText: string;
}

export async function translateImageWithGemini(
  imageBase64: string,
  targetLang: string
): Promise<VisionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  const ai = new GoogleGenAI({ apiKey });
  const targetName = getLanguageNameForPrompt(targetLang);

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64,
            },
          },
          {
            text: `Detect all text in this image. Identify the language. Translate all detected text to ${targetName}. Return as JSON: { "detectedLanguage": string, "originalText": string, "translatedText": string }. Return ONLY the JSON, no other text.`,
          },
        ],
      },
    ],
  });

  const responseText = response.text ?? "";
  return parseVisionResponse(responseText);
}

function parseVisionResponse(responseText: string): VisionResult {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        detectedLanguage: parsed.detectedLanguage || "unknown",
        originalText: parsed.originalText || "",
        translatedText: parsed.translatedText || "",
      };
    }
  } catch {
    // Fall through to fallback
  }

  return {
    detectedLanguage: "unknown",
    originalText: "",
    translatedText: responseText,
  };
}
