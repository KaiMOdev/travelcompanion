import { VisionResponse, SmartVisionResponse, TranslateErrorResponse } from '../types';
import { API_URL } from './api';

export async function translateImage(
  image: string,
  targetLang: string,
): Promise<VisionResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/vision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, targetLang }),
    });
  } catch {
    throw new Error('Could not connect to translation server');
  }

  if (!response.ok) {
    const body: TranslateErrorResponse = await response.json();
    throw new Error(body.error || 'Image translation failed');
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, targetLang, dietaryPreferences }),
    });
  } catch {
    throw new Error('Could not connect to translation server');
  }

  if (!response.ok) {
    const body: TranslateErrorResponse = await response.json();
    throw new Error(body.error || 'Smart vision translation failed');
  }

  return response.json();
}
