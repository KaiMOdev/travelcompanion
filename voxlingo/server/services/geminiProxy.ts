export interface GeminiProxyConfig {
  apiKey: string;
  model: string;
}

export function getGeminiConfig(): GeminiProxyConfig {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  return {
    apiKey,
    model: "gemini-2.0-flash",
  };
}

export async function translateWithGeminiVision(
  _imageBase64: string,
  _targetLang: string
): Promise<{ detectedLanguage: string; originalText: string; translatedText: string }> {
  // TODO: Implement in Camera Mode task
  return {
    detectedLanguage: "",
    originalText: "",
    translatedText: "",
  };
}
