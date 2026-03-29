import { useState } from "react";
import { LanguageCode } from "../types";

export function useLanguageDetect() {
  const [detectedLang, setDetectedLang] = useState<LanguageCode | null>(null);

  const detectLanguage = async (_audioChunk: ArrayBuffer) => {
    // TODO: Implement in Meeting Mode task
    setDetectedLang(null);
  };

  return {
    detectedLang,
    detectLanguage,
  };
}
