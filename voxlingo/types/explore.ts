export type ExploreCategoryId =
  | 'street-food'
  | 'hidden-history'
  | 'chill-spots'
  | 'after-dark'
  | 'hidden-gems'
  | 'creative-scene'
  | 'nature-escapes'
  | 'local-markets';

export type ExploreCategory = {
  id: ExploreCategoryId;
  emoji: string;
  label: string;
  description: string;
};

export type PlacePhrase = {
  english: string;
  local: string;
  context?: string;
};

export type ExplorePlace = {
  name: string;
  localName: string;
  description: string;
  whySpecial: string;
  vibeTags: string[];
  phrases: PlacePhrase[];
  area?: string;
};
