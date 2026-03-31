export type Translation = {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
};

export type TranslateRequest = {
  audio: string;
  sourceLang: string;
  targetLang: string;
};

export type TranslateResponse = {
  originalText: string;
  translatedText: string;
};

export type TranslateErrorResponse = {
  error: string;
};

export type Language = {
  code: string;
  name: string;
};
