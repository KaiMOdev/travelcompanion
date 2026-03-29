export type LanguageCode =
  | "en" | "es" | "zh" | "hi" | "ja" | "ko"
  | "th" | "vi" | "id" | "tl" | "pt" | "it"
  | "ru" | "tr" | "pl" | "nl" | "ar";

export type TranslationMode = "travel" | "camera" | "meeting";

export interface Translation {
  id: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  originalText: string;
  translatedText: string;
  mode: TranslationMode;
  timestamp: number;
  cached: boolean;
}

export interface TranscriptEntry {
  speaker: string;
  lang: LanguageCode;
  original: string;
  translated: string;
  timestamp: number;
}

export interface Transcript {
  id: string;
  title: string;
  date: number;
  duration: number;
  speakers: string[];
  entries: TranscriptEntry[];
  exportedAs: "txt" | "pdf" | null;
}

export interface WordListItem {
  id: string;
  word: string;
  translation: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  savedAt: number;
}

export interface UserProfile {
  displayName: string;
  email: string;
  preferredLanguages: LanguageCode[];
  createdAt: number;
}

export interface UserSettings {
  defaultSourceLang: LanguageCode;
  defaultTargetLang: LanguageCode;
  autoDetect: boolean;
}

export interface VisionTranslationResult {
  detectedLanguage: string;
  originalText: string;
  translatedText: string;
}

export interface MeetingUtterance {
  speaker: string;
  lang: string;
  original: string;
  translated: string;
}
