import { useState, useEffect, useRef } from 'react';
import { fetchPhrases } from '../services/destination';
import { Phrase } from '../types';

export function usePhrases(destination: string | null) {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef(new Map<string, Phrase[]>());

  useEffect(() => {
    if (!destination) {
      setPhrases([]);
      return;
    }

    const cached = cacheRef.current.get(destination);
    if (cached) {
      setPhrases(cached);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchPhrases(destination)
      .then((data) => {
        if (!cancelled) {
          cacheRef.current.set(destination, data);
          setPhrases(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load phrases');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [destination]);

  return { phrases, isLoading, error };
}
