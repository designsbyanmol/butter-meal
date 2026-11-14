// src/hooks/useRefreshCooldown.ts
import { useCallback, useEffect, useRef, useState } from "react";

const COOLDOWN_MS = 60_000; // 1 minute

export function useRefreshCooldown(tenantSlug?: string | null) {
  const storageKey = tenantSlug ? `refresh-cooldown::${tenantSlug}` : null;

  const getRemaining = useCallback((): number => {
    if (!storageKey) return 0;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return 0;
      const remaining = COOLDOWN_MS - (Date.now() - Number(raw));
      return remaining > 0 ? remaining : 0;
    } catch {
      return 0;
    }
  }, [storageKey]);

  const [remainingMs, setRemainingMs] = useState<number>(() =>
    getRemaining(),
  );

  const timerRef = useRef<number | null>(null);

  // While there's time left, tick every second so the button label
  // updates. Stop the interval the moment the window expires.
  useEffect(() => {
    if (remainingMs <= 0) {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Kick off a 1s interval that recomputes from the stored timestamp
    // (so it stays accurate even if the tab is throttled / backgrounded).
    timerRef.current = window.setInterval(() => {
      const next = getRemaining();
      setRemainingMs(next);
      if (next <= 0 && timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [remainingMs > 0, getRemaining]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-sync when the tab becomes visible again (covers backgrounded tabs
  // where setInterval is throttled).
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) setRemainingMs(getRemaining());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [getRemaining]);

  const trigger = useCallback(
    async (fn: () => Promise<void> | void) => {
      if (getRemaining() > 0) return;

      if (storageKey) {
        try {
          sessionStorage.setItem(storageKey, String(Date.now()));
        } catch {
          /* ignore */
        }
      }
      setRemainingMs(COOLDOWN_MS);

      try {
        await fn();
      } finally {
        // The interval in the effect above will drain remainingMs to 0.
        // Force a recompute in case the callback resolved faster than
        // the first tick:
        setRemainingMs(getRemaining());
      }
    },
    [getRemaining, storageKey],
  );

  return {
    cooldownActive: remainingMs > 0,
    remainingMs,
    cooldownSeconds: Math.ceil(remainingMs / 1000),
    trigger,
  };
}

export const REFRESH_COOLDOWN_MS = COOLDOWN_MS;