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

export type VisionRequest = {
  image: string;
  targetLang: string;
};

export type VisionResponse = {
  detectedLanguage: string;
  originalText: string;
  translatedText: string;
};

export type {
  Destination,
  Phrase,
  CulturalTip,
  CultureCategory,
  CultureEntry,
  MenuItem,
  MenuTranslation,
  SignTranslation,
  GeneralTranslation,
  SmartVisionResponse,
  EmergencyInfo,
} from './travel';

export type {
  ExplorePlace,
  PlacePhrase,
  ExploreCategory,
  ExploreCategoryId,
} from './explore';
