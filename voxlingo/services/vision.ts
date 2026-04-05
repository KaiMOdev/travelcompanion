import { VisionResponse, SmartVisionResponse } from '../types';
import { API_URL, apiHeaders } from './api';

export async function translateImage(
  image: string,
  targetLang: string,
): Promise<VisionResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/vision`, {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ image, targetLang }),
    });
  } catch {
    throw new Error('Could not connect to translation server');
  }

  if (!response.ok) {
    let message = 'Image translation failed';
    try { message = (await response.json()).error || message; } catch { /* non-JSON response */ }
    throw new Error(message);
  }

  return response.json();
}

export async function translateImageSmart(
  image: string,
  targetLang: string,
  dietaryPreferences?: string[],
): Promise<SmartVisionResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/vision`, {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ image, targetLang, dietaryPreferences }),
    });
  } catch {
    throw new Error('Could not connect to translation server');
  }

  if (!response.ok) {
    let message = 'Smart vision translation failed';
    try { message = (await response.json()).error || message; } catch { /* non-JSON response */ }
    throw new Error(message);
  }

  return response.json();
}
