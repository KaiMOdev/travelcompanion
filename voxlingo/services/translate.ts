import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { TranslateResponse, TranslateErrorResponse } from '../types';

function getApiUrl(): string {
  if (Platform.OS === 'web') {
    return 'http://localhost:3001';
  }
  // On mobile, use the dev machine's LAN IP from Expo
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:3001`;
  }
  return 'http://localhost:3001';
}

const API_URL = getApiUrl();

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
