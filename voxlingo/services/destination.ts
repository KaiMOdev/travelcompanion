import { API_URL, apiHeaders } from './api';
import { Phrase, CulturalTip, CultureEntry, CultureCategory } from '../types';

export async function fetchPhrases(countryCode: string): Promise<Phrase[]> {
  const response = await fetch(`${API_URL}/destination/${countryCode}/phrases`, {
    headers: apiHeaders(),
  });
  if (!response.ok) {
    let message = 'Failed to fetch phrases';
    try { message = (await response.json()).error || message; } catch { /* non-JSON response */ }
    throw new Error(message);
  }
  return response.json();
}

export async function fetchTips(countryCode: string): Promise<CulturalTip[]> {
  const response = await fetch(`${API_URL}/destination/${countryCode}/tips`, {
    headers: apiHeaders(),
  });
  if (!response.ok) {
    let message = 'Failed to fetch tips';
    try { message = (await response.json()).error || message; } catch { /* non-JSON response */ }
    throw new Error(message);
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
    { signal, headers: apiHeaders() },
  );
  if (!response.ok) {
    let message = 'Failed to fetch culture content';
    try { message = (await response.json()).error || message; } catch { /* non-JSON response */ }
    throw new Error(message);
  }
  return response.json();
}
