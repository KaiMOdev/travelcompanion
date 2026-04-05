import { Platform } from 'react-native';
import Constants from 'expo-constants';

const PRODUCTION_URL = Constants.expoConfig?.extra?.serverUrl ?? 'https://wandervox-server.fly.dev';

export function getApiUrl(): string {
  if (__DEV__) {
    if (Platform.OS === 'web') {
      return 'http://localhost:3001';
    }
    const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
    if (debuggerHost) {
      const host = debuggerHost.split(':')[0];
      return `http://${host}:3001`;
    }
    return 'http://localhost:3001';
  }
  return PRODUCTION_URL;
}

export const API_URL = getApiUrl();

const SERVER_API_KEY = Constants.expoConfig?.extra?.serverApiKey as string | undefined;

export function apiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (SERVER_API_KEY) {
    headers['x-api-key'] = SERVER_API_KEY;
  }
  return headers;
}
