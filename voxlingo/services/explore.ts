import { API_URL, apiHeaders } from './api';
import { ExplorePlace } from '../types';

export async function fetchExplorePlaces(
  countryCode: string,
  category: string,
  signal?: AbortSignal,
): Promise<ExplorePlace[]> {
  const response = await fetch(
    `${API_URL}/destination/${countryCode}/explore/${category}`,
    { signal, headers: apiHeaders() },
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to fetch explore places');
  }
  return response.json();
}
