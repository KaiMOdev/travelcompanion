import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchExplorePlaces, ExploreLocationParams } from '../services/explore';
import { ExplorePlace, ExploreCategoryId } from '../types';

const PAGE_SIZE = 10;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

type CacheEntry = {
  timestamp: number;
  data: ExplorePlace[];
};

function buildCacheKey(destination: string, category: ExploreCategoryId, location?: ExploreLocationParams): string {
  let key = `explore:${destination}:${category}`;
  if (location?.lat != null && location?.lng != null) {
    key += `:${location.lat.toFixed(2)}_${location.lng.toFixed(2)}_${location.radius || 10}km`;
  } else if (location?.city) {
    key += `:${location.city}`;
  }
  return key;
}

export function useExplore(
  destination: string | null,
  category: ExploreCategoryId | null,
  location?: ExploreLocationParams,
) {
  const [allPlaces, setAllPlaces] = useState<ExplorePlace[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memCacheRef = useRef(new Map<string, { data: ExplorePlace[]; timestamp: number }>());

  // Stable serialization of location for dependency array
  const locationKey = location?.lat != null && location?.lng != null
    ? `${location.lat.toFixed(2)}_${location.lng.toFixed(2)}_${location.radius || 10}`
    : location?.city || '';

  // Reset page when destination, category, or location changes
  useEffect(() => {
    setPage(1);
  }, [destination, category, locationKey]);

  useEffect(() => {
    if (!destination || !category) {
      setAllPlaces([]);
      return;
    }

    const key = buildCacheKey(destination, category, location);

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
        const stored = await AsyncStorage.getItem(key);
        if (stored && !cancelled) {
          const parsed: CacheEntry = JSON.parse(stored);
          if (Date.now() - parsed.timestamp < CACHE_TTL) {
            memCacheRef.current.set(key, { data: parsed.data, timestamp: parsed.timestamp });
            setAllPlaces(parsed.data);
            return;
          }
        }
      } catch (e) {
        console.warn('AsyncStorage read failed for explore cache:', e);
      }

      // 3. Fetch from server
      if (cancelled) return;
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchExplorePlaces(destination, category, controller.signal, location);
        if (!controller.signal.aborted) {
          memCacheRef.current.set(key, { data, timestamp: Date.now() });
          setAllPlaces(data);
          // Persist to AsyncStorage
          try {
            const entry: CacheEntry = { timestamp: Date.now(), data };
            await AsyncStorage.setItem(key, JSON.stringify(entry));
          } catch (e) {
            console.warn('AsyncStorage write failed for explore cache:', e);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, category, locationKey]);

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
