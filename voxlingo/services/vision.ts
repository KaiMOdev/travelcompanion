import { LanguageCode, VisionTranslationResult } from "../types";

const BACKEND_URL = __DEV__
  ? "http://localhost:3001"
  : "https://your-production-server.com";

const VISION_TIMEOUT_MS = 30_000; // 30 second timeout

export async function translateImage(
  imageBase64: string,
  targetLang: LanguageCode
): Promise<VisionTranslationResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);

  try {
    const response = await fetch(`${BACKEND_URL}/api/translate/image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: imageBase64,
        targetLang,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Translation failed with status ${response.status}`
      );
    }

    return response.json();
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("Image translation timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
