import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCultureCategory } from '../services/destination';
import { CultureEntry, CultureCategory } from '../types';

const PAGE_SIZE = 10;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

type CacheEntry = {
  timestamp: number;
  data: CultureEntry[];
};

function storageKey(destination: string, category: CultureCategory): string {
  return `culture:${destination}:${category}`;
}

export function useCulture(destination: string | null, category: CultureCategory | null) {
  const [allEntries, setAllEntries] = useState<CultureEntry[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memCacheRef = useRef(new Map<string, { data: CultureEntry[]; timestamp: number }>());

  // Reset page when destination or category changes
  useEffect(() => {
    setPage(1);
  }, [destination, category]);

  useEffect(() => {
    if (!destination || !category) {
      setAllEntries([]);
      return;
    }

    const key = `${destination}:${category}`;

    // 1. Check in-memory cache (with TTL)
    const memCached = memCacheRef.current.get(key);
    if (memCached && Date.now() - memCached.timestamp < CACHE_TTL) {
      setAllEntries(memCached.data);
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
            setAllEntries(parsed.data);
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
        const data = await fetchCultureCategory(destination, category, controller.signal);
        if (!controller.signal.aborted) {
          memCacheRef.current.set(key, { data, timestamp: Date.now() });
          setAllEntries(data);
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
          setError(err instanceof Error ? err.message : 'Failed to load content');
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

  const totalPages = Math.ceil(allEntries.length / PAGE_SIZE);
  const entries = allEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = allEntries.length;

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  return {
    entries,
    allEntries,
    page,
    totalPages,
    total,
    nextPage,
    prevPage,
    isLoading,
    error,
  };
}
