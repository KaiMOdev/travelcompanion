import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPhrases } from '../services/destination';
import { Phrase } from '../types';

const PAGE_SIZE = 10;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

type CacheEntry = {
  timestamp: number;
  data: Phrase[];
};

export function usePhrases(destination: string | null) {
  const [allPhrases, setAllPhrases] = useState<Phrase[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memCacheRef = useRef(new Map<string, { data: Phrase[]; timestamp: number }>());

  useEffect(() => {
    setPage(1);
  }, [destination]);

  useEffect(() => {
    if (!destination) {
      setAllPhrases([]);
      return;
    }

    const key = destination;

    // 1. Check in-memory cache (with TTL)
    const memCached = memCacheRef.current.get(key);
    if (memCached && Date.now() - memCached.timestamp < CACHE_TTL) {
      setAllPhrases(memCached.data);
      return;
    }

    let cancelled = false;

    (async () => {
      // 2. Check AsyncStorage
      try {
        const stored = await AsyncStorage.getItem(`phrases:${destination}`);
        if (stored && !cancelled) {
          const parsed: CacheEntry = JSON.parse(stored);
          if (Date.now() - parsed.timestamp < CACHE_TTL) {
            memCacheRef.current.set(key, { data: parsed.data, timestamp: parsed.timestamp });
            setAllPhrases(parsed.data);
            return;
          }
        }
      } catch {
        // Fall through to fetch
      }

      // 3. Fetch from server
      if (cancelled) return;
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchPhrases(destination);
        if (!cancelled) {
          memCacheRef.current.set(key, { data, timestamp: Date.now() });
          setAllPhrases(data);
          try {
            await AsyncStorage.setItem(`phrases:${destination}`, JSON.stringify({ timestamp: Date.now(), data }));
          } catch {
            // Non-critical
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load phrases');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [destination]);

  const totalPages = Math.ceil(allPhrases.length / PAGE_SIZE);
  const phrases = allPhrases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = allPhrases.length;

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  return { phrases, allPhrases, page, totalPages, total, nextPage, prevPage, isLoading, error };
}
