// src/hooks/useIsMobile.ts
import { useEffect, useState } from 'react';

/**
 * Returns true when the viewport is <= 640px wide.
 * SSR-safe (returns false during the first render on the server).
 */
export const useIsMobile = (breakpoint = 640): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
};