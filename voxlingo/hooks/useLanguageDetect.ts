import { useState, useCallback } from "react";
import { LanguageCode } from "../types";

const LANGUAGE_CODE_MAP: Record<string, LanguageCode> = {
  english: "en", spanish: "es", chinese: "zh", hindi: "hi",
  japanese: "ja", korean: "ko", thai: "th", vietnamese: "vi",
  indonesian: "id", tagalog: "tl", portuguese: "pt", italian: "it",
  russian: "ru", turkish: "tr", polish: "pl", dutch: "nl", arabic: "ar",
};

export function useLanguageDetect() {
  const [detectedLang, setDetectedLang] = useState<LanguageCode | null>(null);

  const detectFromText = useCallback((languageLabel: string) => {
    const normalized = languageLabel.toLowerCase().trim();
    const code = LANGUAGE_CODE_MAP[normalized] || null;
    setDetectedLang(code);
    return code;
  }, []);

  const reset = useCallback(() => {
    setDetectedLang(null);
  }, []);

  return {
    detectedLang,
    detectFromText,
    reset,
  };
}
