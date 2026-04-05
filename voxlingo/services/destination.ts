import { API_URL } from './api';
import { Phrase, CulturalTip, CultureEntry, CultureCategory } from '../types';

export async function fetchPhrases(countryCode: string): Promise<Phrase[]> {
  const response = await fetch(`${API_URL}/destination/${countryCode}/phrases`);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to fetch phrases');
  }
  return response.json();
}

export async function fetchTips(countryCode: string): Promise<CulturalTip[]> {
  const response = await fetch(`${API_URL}/destination/${countryCode}/tips`);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to fetch tips');
  }
  return response.json();
}

export async function fetchCultureCategory(
  countryCode: string,
  category: CultureCategory,
  signal?: AbortSignal,
): Promise<CultureEntry[]> {
  const response = await fetch(
    `${API_URL}/destination/${countryCode}/culture/${category}`,
    { signal },
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to fetch culture content');
  }
  return response.json();
}
