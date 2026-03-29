import { LanguageCode, VisionTranslationResult } from "../types";

const BACKEND_URL = __DEV__
  ? "http://localhost:3001"
  : "https://your-production-server.com";

export async function translateImage(
  imageBase64: string,
  targetLang: LanguageCode
): Promise<VisionTranslationResult> {
  const response = await fetch(`${BACKEND_URL}/api/translate/image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: imageBase64,
      targetLang,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Translation failed with status ${response.status}`
    );
  }

  return response.json();
}
