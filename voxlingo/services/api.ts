import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function getApiUrl(): string {
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

export const API_URL = getApiUrl();
