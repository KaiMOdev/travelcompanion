import { useState, useEffect, useRef } from 'react';
import { fetchCultureCategory } from '../services/destination';
import { CultureEntry, CultureCategory } from '../types';

export function useCulture(destination: string | null, category: CultureCategory | null) {
  const [entries, setEntries] = useState<CultureEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef(new Map<string, CultureEntry[]>());

  useEffect(() => {
    if (!destination || !category) {
      setEntries([]);
      return;
    }

    const key = `${destination}:${category}`;
    const cached = cacheRef.current.get(key);
    if (cached) {
      setEntries(cached);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchCultureCategory(destination, category, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          cacheRef.current.set(key, data);
          setEntries(data);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load content');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [destination, category]);

  return { entries, isLoading, error };
}
