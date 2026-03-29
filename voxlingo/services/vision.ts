import { LanguageCode, VisionTranslationResult } from "../types";

export async function translateImage(
  _imageBase64: string,
  _targetLang: LanguageCode
): Promise<VisionTranslationResult> {
  // TODO: Implement in Camera Mode task
  return {
    detectedLanguage: "",
    originalText: "",
    translatedText: "",
  };
}
