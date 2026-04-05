import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPhrases, fetchTips } from '../services/destination';
import { Phrase, CulturalTip } from '../types';
import { getDestination } from '../constants/destinations';

const STORAGE_KEY = 'voxlingo_destination';

export function useDestination() {
  const [destination, setDestinationState] = useState<string | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [tips, setTips] = useState<CulturalTip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDestination = useCallback(async (countryCode: string) => {
    setDestinationState(countryCode);
    setIsLoading(true);
    setError(null);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, countryCode);
      const [phrasesData, tipsData] = await Promise.all([
        fetchPhrases(countryCode),
        fetchTips(countryCode),
      ]);
      setPhrases(phrasesData);
      setTips(tipsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load destination data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSaved = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        await setDestination(saved);
      }
    } catch {
      // No saved destination — that's fine
    }
  }, [setDestination]);

  const getLanguageCode = useCallback((): string | undefined => {
    if (!destination) return undefined;
    return getDestination(destination)?.primaryLanguage;
  }, [destination]);

  return {
    destination,
    phrases,
    tips,
    isLoading,
    error,
    setDestination,
    loadSaved,
    getLanguageCode,
  };
}
