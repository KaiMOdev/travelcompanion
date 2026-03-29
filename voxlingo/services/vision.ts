import { LanguageCode, VisionTranslationResult } from "../types";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL
  || (__DEV__ ? "http://localhost:3001" : "https://your-production-server.com");

const VISION_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

async function fetchWithTimeout(
  url: string,
  options: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("Image translation timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function isRetryable(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

export async function translateImage(
  imageBase64: string,
  targetLang: LanguageCode
): Promise<VisionTranslationResult> {
  const body = JSON.stringify({ image: imageBase64, targetLang });
  const headers = { "Content-Type": "application/json" };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(
        `${BACKEND_URL}/api/translate/image`,
        { method: "POST", headers, body }
      );

      if (!response.ok) {
        if (isRetryable(response.status) && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Translation failed with status ${response.status}`
        );
      }

      return response.json();
    } catch (error: any) {
      lastError = error;
      if (error.message?.includes("timed out") && attempt < MAX_RETRIES) {
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Translation failed after retries");
}
