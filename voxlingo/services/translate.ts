import { TranslateResponse, TranslateErrorResponse } from '../types';
import { API_URL } from './api';

export async function translateAudio(
  audio: string,
  sourceLang: string,
  targetLang: string,
  mimeType: string = 'audio/mp4',
): Promise<TranslateResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio, sourceLang, targetLang, mimeType }),
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
