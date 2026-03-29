const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  zh: "Chinese (Mandarin)",
  hi: "Hindi",
  ja: "Japanese",
  ko: "Korean",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  tl: "Tagalog",
  pt: "Portuguese",
  it: "Italian",
  ru: "Russian",
  tr: "Turkish",
  pl: "Polish",
  nl: "Dutch",
  ar: "Arabic",
};

export function getLanguageNameForPrompt(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}
