// src/hooks/useNavigationPreloader.ts
import { useCallback, useRef } from 'react';
import { preloaderBus } from '../components/Preloader/preloaderBus';

interface Options {
  /** Message shown under the logo. Falls back to "Loading...". */
  title?: string;
  /**
   * Safety net: if the navigation somehow fails or is blocked
   * (e.g. middle-click), hide the overlay after this many ms.
   * Default 8 seconds.
   */
  safetyTimeoutMs?: number;
}

export const useNavigationPreloader = (opts: Options = {}) => {
  const timerRef = useRef<number | null>(null);

  const clearSafetyTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * Show the overlay immediately and navigate on the next microtask.
   * Best for plain `window.location.href = X` links.
   */
  const show = useCallback(
    (navigate: () => void, overrideTitle?: string) => {
      preloaderBus.show(overrideTitle ?? opts.title);
      clearSafetyTimer();
      timerRef.current = window.setTimeout(() => {
        preloaderBus.hide();
        timerRef.current = null;
      }, opts.safetyTimeoutMs ?? 8000);
      Promise.resolve().then(navigate);
    },
    [opts.title, opts.safetyTimeoutMs, clearSafetyTimer],
  );

  /**
   * Show the overlay *without* an auto-hide and *without* a
   * navigation callback. The caller controls when to hide it
   * via `hide()`. Best for async flows (payment → setup → next stage).
   */
  const showNow = useCallback(
    (overrideTitle?: string) => {
      clearSafetyTimer();
      preloaderBus.show(overrideTitle ?? opts.title);
    },
    [opts.title, clearSafetyTimer],
  );

  const hide = useCallback(() => {
    clearSafetyTimer();
    preloaderBus.hide();
  }, [clearSafetyTimer]);

  return { show, showNow, hide };
};