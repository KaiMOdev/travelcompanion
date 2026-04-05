import { useState, useEffect, useRef } from 'react';
import { fetchTips } from '../services/destination';
import { CulturalTip } from '../types';

export function useTips(destination: string | null) {
  const [tips, setTips] = useState<CulturalTip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef(new Map<string, CulturalTip[]>());

  useEffect(() => {
    if (!destination) {
      setTips([]);
      return;
    }

    const cached = cacheRef.current.get(destination);
    if (cached) {
      setTips(cached);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchTips(destination)
      .then((data) => {
        if (!cancelled) {
          cacheRef.current.set(destination, data);
          setTips(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tips');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [destination]);

  return { tips, isLoading, error };
}
