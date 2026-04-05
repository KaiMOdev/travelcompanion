import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchExplorePlaces } from '../services/explore';
import { ExplorePlace } from '../types';

const PAGE_SIZE = 10;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

type CacheEntry = {
  timestamp: number;
  data: ExplorePlace[];
};

function storageKey(destination: string, category: string): string {
  return `explore:${destination}:${category}`;
}

export function useExplore(destination: string | null, category: string | null) {
  const [allPlaces, setAllPlaces] = useState<ExplorePlace[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memCacheRef = useRef(new Map<string, { data: ExplorePlace[]; timestamp: number }>());

  // Reset page when destination or category changes
  useEffect(() => {
    setPage(1);
  }, [destination, category]);

  useEffect(() => {
    if (!destination || !category) {
      setAllPlaces([]);
      return;
    }

    const key = `${destination}:${category}`;

    // 1. Check in-memory cache (with TTL)
    const memCached = memCacheRef.current.get(key);
    if (memCached && Date.now() - memCached.timestamp < CACHE_TTL) {
      setAllPlaces(memCached.data);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      // 2. Check AsyncStorage cache
      try {
        const stored = await AsyncStorage.getItem(storageKey(destination, category));
        if (stored && !cancelled) {
          const parsed: CacheEntry = JSON.parse(stored);
          if (Date.now() - parsed.timestamp < CACHE_TTL) {
            memCacheRef.current.set(key, { data: parsed.data, timestamp: parsed.timestamp });
            setAllPlaces(parsed.data);
            return;
          }
        }
      } catch {
        // AsyncStorage read failed — fall through to fetch
      }

      // 3. Fetch from server
      if (cancelled) return;
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchExplorePlaces(destination, category, controller.signal);
        if (!controller.signal.aborted) {
          memCacheRef.current.set(key, { data, timestamp: Date.now() });
          setAllPlaces(data);
          // Persist to AsyncStorage
          try {
            const entry: CacheEntry = { timestamp: Date.now(), data };
            await AsyncStorage.setItem(storageKey(destination, category), JSON.stringify(entry));
          } catch {
            // Non-critical
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load places');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [destination, category]);

  const totalPages = Math.ceil(allPlaces.length / PAGE_SIZE);
  const places = allPlaces.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = allPlaces.length;

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  return {
    places,
    allPlaces,
    page,
    totalPages,
    total,
    nextPage,
    prevPage,
    isLoading,
    error,
  };
}
