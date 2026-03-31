import { TranslateResponse, TranslateErrorResponse } from '../types';

// __DEV__ is a React Native global; default to true when not defined (e.g. in tests)
declare const __DEV__: boolean | undefined;

const API_URL =
  typeof __DEV__ !== 'undefined' && !__DEV__
    ? 'http://localhost:3001' // Update for production later
    : 'http://localhost:3001';

export async function translateAudio(
  audio: string,
  sourceLang: string,
  targetLang: string,
): Promise<TranslateResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio, sourceLang, targetLang }),
    });
  } catch {
    throw new Error('Could not connect to translation server');
  }

  if (!response.ok) {
    const body: TranslateErrorResponse = await response.json();
    throw new Error(body.error || 'Translation failed');
  }

  return response.json();
}
