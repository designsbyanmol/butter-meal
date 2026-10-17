// components/Dashboard/useActiveSection.ts
import { useCallback, useEffect, useState } from 'react';

/**
 * Session-scoped persistence for the shell's active section.
 *
 * Keys are namespaced per scope (tenant slug or `__platform`) so
 * switching tenants never restores the wrong section.
 *
 * An empty sessionStorage value (or a missing one) means "no section
 * selected" - the shell will render its greeting. Logout clears the
 * key so the next login always starts at the greeting.
 */
const STORAGE_KEY = 'dashboard:active-section:v1';

const keyFor = (scope: string): string => `${STORAGE_KEY}::${scope}`;

const readStored = (scope: string): string | null => {
  try {
    const v = sessionStorage.getItem(keyFor(scope));
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
};

export const useActiveSection = (scope: string) => {
  const [activeKey, setActiveKeyState] = useState<string | null>(() =>
    readStored(scope),
  );

  // Re-hydrate when the scope changes (e.g. tenant switch).
  useEffect(() => {
    setActiveKeyState(readStored(scope));
  }, [scope]);

  const setActiveKey = useCallback(
    (key: string | null) => {
      const normalized = key && key.length > 0 ? key : null;
      setActiveKeyState(normalized);
      try {
        if (normalized) {
          sessionStorage.setItem(keyFor(scope), normalized);
        } else {
          sessionStorage.removeItem(keyFor(scope));
        }
      } catch {
        /* private mode / quota - ignore */
      }
    },
    [scope],
  );

  return { activeKey, setActiveKey };
};