import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPhrases, fetchTips } from '../services/destination';
import { Phrase, CulturalTip } from '../types';
import { getDestination } from '../constants/destinations';

const STORAGE_KEY = 'voxlingo_destination';
const HOTEL_STORAGE_KEY = 'voxlingo_hotel_address';

export function useDestination() {
  const [destination, setDestinationState] = useState<string | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [tips, setTips] = useState<CulturalTip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hotelAddress, setHotelAddressState] = useState<string>('');

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

  const setHotelAddress = useCallback(async (address: string) => {
    setHotelAddressState(address);
    await AsyncStorage.setItem(HOTEL_STORAGE_KEY, address);
  }, []);

  const loadSaved = useCallback(async () => {
    try {
      const [saved, savedHotel] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(HOTEL_STORAGE_KEY),
      ]);
      if (savedHotel) setHotelAddressState(savedHotel);
      if (saved) await setDestination(saved);
    } catch {
      // No saved data — that's fine
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
    hotelAddress,
    setHotelAddress,
    loadSaved,
    getLanguageCode,
  };
}
