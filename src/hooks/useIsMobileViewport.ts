// src/hooks/useIsMobileViewport.ts
import { useEffect, useState } from 'react';

/**
 * Returns true when the viewport is <= `maxWidth` px (default 640).
 *
 * Distinct from `useIsMobile` which returns a "should show mobile
 * layout" boolean - this hook always reflects the CURRENT viewport
 * width regardless of any other logic. Used by Modal and Sheet to
 * gate mobile-only behaviours (history push, exit animation) on
 * actual mobile viewports, not on the `mobileFullScreen` prop.
 */
export const useIsMobileViewport = (maxWidth = 640): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [maxWidth]);

  return isMobile;
};