import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDestination } from '../constants/destinations';

const STORAGE_KEY = 'wandervox_destination';
const HOTEL_STORAGE_KEY = 'wandervox_hotel_address';

type DestinationContextValue = {
  destination: string | null;
  setDestination: (code: string) => Promise<void>;
  hotelAddress: string;
  setHotelAddress: (address: string) => void;
  saveHotelAddress: () => Promise<void>;
  getLanguageCode: () => string | undefined;
  isLoaded: boolean;
};

const DestinationContext = createContext<DestinationContextValue | null>(null);

export function DestinationProvider({ children }: { children: React.ReactNode }) {
  const [destination, setDestinationState] = useState<string | null>(null);
  const [hotelAddress, setHotelAddressState] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  const setDestination = useCallback(async (countryCode: string) => {
    setDestinationState(countryCode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, countryCode);
    } catch {
      // Non-critical
    }
  }, []);

  const setHotelAddress = useCallback((address: string) => {
    setHotelAddressState(address);
  }, []);

  const saveHotelAddress = useCallback(async () => {
    try {
      await AsyncStorage.setItem(HOTEL_STORAGE_KEY, hotelAddress);
    } catch {
      // Non-critical
    }
  }, [hotelAddress]);

  const getLanguageCode = useCallback((): string | undefined => {
    if (!destination) return undefined;
    return getDestination(destination)?.primaryLanguage;
  }, [destination]);

  useEffect(() => {
    (async () => {
      try {
        const [saved, savedHotel] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(HOTEL_STORAGE_KEY),
        ]);
        if (savedHotel) setHotelAddressState(savedHotel);
        if (saved) setDestinationState(saved);
      } catch {
        // No saved data
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  return (
    <DestinationContext.Provider
      value={{
        destination,
        setDestination,
        hotelAddress,
        setHotelAddress,
        saveHotelAddress,
        getLanguageCode,
        isLoaded,
      }}
    >
      {children}
    </DestinationContext.Provider>
  );
}

export function useDestinationContext(): DestinationContextValue {
  const ctx = useContext(DestinationContext);
  if (!ctx) throw new Error('useDestinationContext must be used within DestinationProvider');
  return ctx;
}
