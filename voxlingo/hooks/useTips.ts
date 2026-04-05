import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchTips } from '../services/destination';
import { CulturalTip } from '../types';

const PAGE_SIZE = 10;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

type CacheEntry = {
  timestamp: number;
  data: CulturalTip[];
};

export function useTips(destination: string | null) {
  const [allTips, setAllTips] = useState<CulturalTip[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memCacheRef = useRef(new Map<string, { data: CulturalTip[]; timestamp: number }>());

  useEffect(() => {
    setPage(1);
  }, [destination]);

  useEffect(() => {
    if (!destination) {
      setAllTips([]);
      return;
    }

    const key = destination;

    // 1. Check in-memory cache (with TTL)
    const memCached = memCacheRef.current.get(key);
    if (memCached && Date.now() - memCached.timestamp < CACHE_TTL) {
      setAllTips(memCached.data);
      return;
    }

    let cancelled = false;

    (async () => {
      // 2. Check AsyncStorage
      try {
        const stored = await AsyncStorage.getItem(`tips:${destination}`);
        if (stored && !cancelled) {
          const parsed: CacheEntry = JSON.parse(stored);
          if (Date.now() - parsed.timestamp < CACHE_TTL) {
            memCacheRef.current.set(key, { data: parsed.data, timestamp: parsed.timestamp });
            setAllTips(parsed.data);
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
        const data = await fetchTips(destination);
        if (!cancelled) {
          memCacheRef.current.set(key, { data, timestamp: Date.now() });
          setAllTips(data);
          try {
            await AsyncStorage.setItem(`tips:${destination}`, JSON.stringify({ timestamp: Date.now(), data }));
          } catch {
            // Non-critical
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tips');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [destination]);

  const totalPages = Math.ceil(allTips.length / PAGE_SIZE);
  const tips = allTips.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = allTips.length;

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  return { tips, allTips, page, totalPages, total, nextPage, prevPage, isLoading, error };
}
