// src/hooks/useLazyLoad.ts
import { useEffect, useRef, useState } from 'react';

/**
 * Runs `loader` the first time `isOpen` becomes true.
 * Subsequent opens use the cached value unless you call `reload`.
 *
 * Returns:
 *   - `data`      - the loaded value (or null before first load)
 *   - `isLoading` - true while the loader is running
 *   - `error`     - the last error, if any
 *   - `reload`    - force a re-fetch (e.g. after a mutation)
 */
export const useLazyLoad = <T>(
  isOpen: boolean,
  loader: () => Promise<T>,
): {
  data: T | null;
  isLoading: boolean;
  error: string;
  reload: () => Promise<void>;
} => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const hasLoadedRef = useRef(false);
  const inFlightRef = useRef(false);

  const run = async (force = false) => {
    if (inFlightRef.current) return;
    if (hasLoadedRef.current && !force) return;

    inFlightRef.current = true;
    setIsLoading(true);
    setError('');
    try {
      const result = await loader();
      setData(result);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return {
    data,
    isLoading,
    error,
    reload: () => run(true),
  };
};