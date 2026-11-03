// src/hooks/useHospitalBillingDraft.ts
import { useEffect, useRef, useState } from 'react';

/**
 * Persists a form's state to localStorage under `key`.
 * - On mount, hydrates from localStorage (merged with `initial` so new
 *   fields added to `initial` after the draft was saved still appear).
 * - On every state change, writes the whole state back.
 * - `clear()` resets both localStorage AND in-memory state to `initial`.
 *
 * Deep-merge is intentionally shallow (`{ ...initial, ...parsed }`) so
 * nested objects must be handled carefully by callers. In practice all
 * our billing drafts are flat except for `vitals`, which is included
 * as a whole and re-rendered together - that's fine.
 */
export const useHospitalBillingDraft = <T extends object>(
  key: string | null,
  initial: T,
): readonly [T, React.Dispatch<React.SetStateAction<T>>, () => void] => {
  const initialRef = useRef(initial);

  const readOnce = (k: string | null): T => {
    if (!k) return initialRef.current;
    try {
      const raw = localStorage.getItem(k);
      if (!raw) return initialRef.current;
      const parsed = JSON.parse(raw) as Partial<T>;
      return { ...initialRef.current, ...parsed };
    } catch {
      return initialRef.current;
    }
  };

  const [state, setState] = useState<T>(() => readOnce(key));
  const firstWrite = useRef(true);
  const lastKey = useRef<string | null>(key);

  // If the key changes (e.g. tenant slug becomes available after the
  // first render), re-hydrate from the new key without losing data.
  useEffect(() => {
    if (!key) return;
    if (key === lastKey.current) return;
    lastKey.current = key;
    setState(readOnce(key));
  }, [key]);

  // Persist on every change (skip the very first render).
  useEffect(() => {
    if (!key) return;
    if (firstWrite.current) {
      firstWrite.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* quota / private mode - ignore */
    }
  }, [key, state]);

  const clear = () => {
    if (key) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    setState(initialRef.current);
    firstWrite.current = true;
  };

  return [state, setState, clear] as const;
};