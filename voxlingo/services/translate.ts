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

export async function translateAudioStream(
  audio: string,
  sourceLang: string,
  targetLang: string,
  mimeType: string = 'audio/mp4',
  onPartial: (partial: Partial<TranslateResponse>) => void,
): Promise<TranslateResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/translate/stream`, {
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

  // Read the SSE stream (not available on all platforms — Android RN lacks ReadableStream)
  const reader = response.body?.getReader();
  if (!reader) {
    // Fallback: read the entire response as text and parse SSE events
    const text = await response.text();
    let finalResult: TranslateResponse = { originalText: '', translatedText: '' };
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.originalText) finalResult.originalText = parsed.originalText;
          if (parsed.translatedText) finalResult.translatedText = parsed.translatedText;
          onPartial(finalResult);
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
    if (!finalResult.originalText && !finalResult.translatedText) {
      throw new Error('No translation received');
    }
    return finalResult;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: TranslateResponse = { originalText: '', translatedText: '' };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process SSE lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.originalText) finalResult.originalText = parsed.originalText;
          if (parsed.translatedText) finalResult.translatedText = parsed.translatedText;
          onPartial(finalResult);
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
  }

  if (!finalResult.originalText && !finalResult.translatedText) {
    throw new Error('No translation received');
  }

  return finalResult;
}
