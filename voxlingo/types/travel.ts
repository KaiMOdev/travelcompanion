export type Destination = {
  countryCode: string;
  countryName: string;
  primaryLanguage: string;
  isHero: boolean;
};

export type Phrase = {
  id: string;
  english: string;
  translated: string;
  romanized?: string;
  category: 'greeting' | 'food' | 'directions' | 'emergency' | 'polite' | 'shopping';
  isEditorial: boolean;
};

export type CulturalTip = {
  id: string;
  category: 'etiquette' | 'money' | 'food' | 'safety' | 'social' | 'language';
  title: string;
  body: string;
  countryCode: string;
  sourceType: 'editorial' | 'ai-generated';
};

export type MenuItem = {
  original: string;
  translated: string;
  description: string;
  possibleAllergens: string[];
  allergenConfidence: 'high' | 'medium' | 'low';
  dietary: ('vegetarian' | 'vegan' | 'halal' | 'kosher')[];
  popular: boolean;
};

export type MenuTranslation = {
  contentType: 'menu';
  detectedLanguage: string;
  items: MenuItem[];
  disclaimer: string;
};

export type SignTranslation = {
  contentType: 'sign';
  detectedLanguage: string;
  originalText: string;
  translatedText: string;
  context: string;
};

export type GeneralTranslation = {
  contentType: 'general';
  detectedLanguage: string;
  originalText: string;
  translatedText: string;
};

export type SmartVisionResponse = MenuTranslation | SignTranslation | GeneralTranslation;

export type EmergencyInfo = {
  countryCode: string;
  police: string;
  ambulance: string;
  fire: string;
  advisoryUrl: string;
  phrases: {
    help: string;
    callAmbulance: string;
    dontSpeak: string;
  };
};

export type CultureCategory =
  | 'phrases'
  | 'tips'
  | 'dos-donts'
  | 'gestures'
  | 'food'
  | 'tipping'
  | 'sacred-sites'
  | 'numbers';

export type CultureEntry = {
  id: string;
  category: CultureCategory;
  title: string;
  body: string;
  countryCode: string;
  speakable?: string;
  romanized?: string;
};
