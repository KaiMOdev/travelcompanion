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
    let message = 'Failed to fetch explore places';
    try {
      const err = await response.json();
      message = err.error || message;
    } catch {
      // Non-JSON error response — use default message
    }
    throw new Error(message);
  }
  return response.json();
}
