// src/components/Dashboard/useActiveSection.ts
import { useCallback, useEffect, useState } from 'react';

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