import { API_URL, apiHeaders } from './api';
import { ExplorePlace } from '../types';

export type ExploreLocationParams = {
  lat?: number;
  lng?: number;
  radius?: number;
  city?: string;
};

export async function fetchExplorePlaces(
  countryCode: string,
  category: string,
  signal?: AbortSignal,
  location?: ExploreLocationParams,
): Promise<ExplorePlace[]> {
  const params = new URLSearchParams();
  if (location?.lat != null && location?.lng != null) {
    params.set('lat', String(location.lat));
    params.set('lng', String(location.lng));
  }
  if (location?.radius !== undefined) params.set('radius', String(location.radius));
  if (location?.city) params.set('city', location.city);

  const qs = params.toString();
  const url = `${API_URL}/destination/${countryCode}/explore/${category}${qs ? `?${qs}` : ''}`;

  const response = await fetch(url, { signal, headers: apiHeaders() });
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
