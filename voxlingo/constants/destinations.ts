import { Destination } from '../types';

export const DESTINATIONS: Destination[] = [
  // Hero destinations (editorially curated content)
  { countryCode: 'JP', countryName: 'Japan', primaryLanguage: 'ja', isHero: true },
  { countryCode: 'TH', countryName: 'Thailand', primaryLanguage: 'th', isHero: true },
  { countryCode: 'IT', countryName: 'Italy', primaryLanguage: 'it', isHero: true },
  // Standard destinations
  { countryCode: 'ES', countryName: 'Spain', primaryLanguage: 'es', isHero: false },
  { countryCode: 'FR', countryName: 'France', primaryLanguage: 'fr', isHero: false },
  { countryCode: 'DE', countryName: 'Germany', primaryLanguage: 'de', isHero: false },
  { countryCode: 'KR', countryName: 'South Korea', primaryLanguage: 'ko', isHero: false },
  { countryCode: 'CN', countryName: 'China', primaryLanguage: 'zh', isHero: false },
  { countryCode: 'VN', countryName: 'Vietnam', primaryLanguage: 'vi', isHero: false },
  { countryCode: 'ID', countryName: 'Indonesia', primaryLanguage: 'id', isHero: false },
  { countryCode: 'BR', countryName: 'Brazil', primaryLanguage: 'pt', isHero: false },
  { countryCode: 'MX', countryName: 'Mexico', primaryLanguage: 'es', isHero: false },
  { countryCode: 'TR', countryName: 'Turkey', primaryLanguage: 'tr', isHero: false },
  { countryCode: 'NL', countryName: 'Netherlands', primaryLanguage: 'nl', isHero: false },
  { countryCode: 'PL', countryName: 'Poland', primaryLanguage: 'pl', isHero: false },
  { countryCode: 'GR', countryName: 'Greece', primaryLanguage: 'el', isHero: false },
  { countryCode: 'PT', countryName: 'Portugal', primaryLanguage: 'pt', isHero: false },
  { countryCode: 'CZ', countryName: 'Czech Republic', primaryLanguage: 'cs', isHero: false },
  { countryCode: 'HU', countryName: 'Hungary', primaryLanguage: 'hu', isHero: false },
  { countryCode: 'HR', countryName: 'Croatia', primaryLanguage: 'hr', isHero: false },
  { countryCode: 'RO', countryName: 'Romania', primaryLanguage: 'ro', isHero: false },
  { countryCode: 'SE', countryName: 'Sweden', primaryLanguage: 'sv', isHero: false },
  { countryCode: 'NO', countryName: 'Norway', primaryLanguage: 'no', isHero: false },
  { countryCode: 'DK', countryName: 'Denmark', primaryLanguage: 'da', isHero: false },
  { countryCode: 'FI', countryName: 'Finland', primaryLanguage: 'fi', isHero: false },
  { countryCode: 'RU', countryName: 'Russia', primaryLanguage: 'ru', isHero: false },
  { countryCode: 'UA', countryName: 'Ukraine', primaryLanguage: 'uk', isHero: false },
  { countryCode: 'IN', countryName: 'India', primaryLanguage: 'hi', isHero: false },
  { countryCode: 'PH', countryName: 'Philippines', primaryLanguage: 'tl', isHero: false },
  { countryCode: 'SA', countryName: 'Saudi Arabia', primaryLanguage: 'ar', isHero: false },
];

export const getDestination = (countryCode: string): Destination | undefined =>
  DESTINATIONS.find((d) => d.countryCode === countryCode);

export const HERO_DESTINATIONS = DESTINATIONS.filter((d) => d.isHero);
