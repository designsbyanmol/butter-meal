// contexts/StoreContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from 'react';
import { StoreSettings } from '../types';
import { db } from '../services/database.service';
import { TABLES } from '../config/tables';
import { isSupabaseConfigured } from '../config/env';

interface StoreContextType {
  storeSettings: StoreSettings;
  updateStoreSettings: (settings: Partial<StoreSettings>) => void;
  isStoreOpen: boolean;
  isLoading: boolean;
  setPollingPaused: (paused: boolean) => void;
}

const defaultStoreSettings: StoreSettings = {
  isOpen: true,
  closedMessage: '',
  expectedOpenDate: '',
  expectedOpenTime: '',
  lastUpdated: new Date().toISOString(),
};

const STORE_SETTINGS_KEY = TABLES.STORE_SETTINGS;

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};

interface StoreProviderProps {
  children: ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const [storeSettings, setStoreSettings] =
    useState<StoreSettings>(defaultStoreSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [pollingPaused, setPollingPaused] = useState(false);

  const lastUpdateTimeRef = useRef<string>('');
  const isFetchingRef = useRef(false);

  // ---------------------------------------------------------
  // Fetch — always trust Supabase when connected
  // ---------------------------------------------------------
  const fetchLatestSettings = async (
    force = false,
  ): Promise<StoreSettings | null> => {
    if (isFetchingRef.current && !force) return null;
    if (pollingPaused && !force) return null;

    try {
      isFetchingRef.current = true;

      const dbSettings = await db.getStoreSettings();
      if (dbSettings) {
        const latest: StoreSettings = {
          isOpen: dbSettings.isOpen ?? true,
          closedMessage: dbSettings.closedMessage || '',
          expectedOpenDate: dbSettings.expectedOpenDate || '',
          expectedOpenTime: dbSettings.expectedOpenTime || '',
          lastUpdated: dbSettings.lastUpdated || new Date().toISOString(),
        };

        // Only setState if something actually changed (avoids re-renders)
        if (latest.lastUpdated !== lastUpdateTimeRef.current) {
          setStoreSettings(latest);
          localStorage.setItem(
            STORE_SETTINGS_KEY,
            JSON.stringify(latest),
          );
          lastUpdateTimeRef.current = latest.lastUpdated;
        }

        isFetchingRef.current = false;
        return latest;
      }

      isFetchingRef.current = false;
      return null;
    } catch (error) {
      console.error('fetchLatestSettings failed:', error);
      isFetchingRef.current = false;
      return null;
    }
  };

  // ---------------------------------------------------------
  // Initial load — read local for instant first paint,
  // then always fetch from DB to get the truth.
  // ---------------------------------------------------------
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Step 1: Quick local paint so UI doesn't flash
        try {
          const saved = localStorage.getItem(STORE_SETTINGS_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            const localSettings: StoreSettings = {
              isOpen: parsed.isOpen ?? true,
              closedMessage: parsed.closedMessage || '',
              expectedOpenDate: parsed.expectedOpenDate || '',
              expectedOpenTime: parsed.expectedOpenTime || '',
              lastUpdated: parsed.lastUpdated || new Date().toISOString(),
            };
            setStoreSettings(localSettings);
            lastUpdateTimeRef.current = localSettings.lastUpdated;
          }
        } catch {
          // ignore local parse errors
        }

        // Step 2: Always hit Supabase when configured — no staleness gate.
        if (isSupabaseConfigured) {
          try {
            const fresh = await fetchLatestSettings(true);
            if (fresh) {
              setStoreSettings(fresh);
            }
          } catch (e) {
            console.error('Initial DB fetch failed:', e);
          }
        }
      } finally {
        setSettingsLoaded(true);
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------
  // Polling — 10s, and re-fetch on tab focus
  // ---------------------------------------------------------
  useEffect(() => {
    if (!settingsLoaded) return;

    const pollInterval = setInterval(() => {
      if (!pollingPaused) {
        fetchLatestSettings(false);
      }
    }, 10_000); // 10s — cheap, one row

    const onFocus = () => {
      if (!pollingPaused) fetchLatestSettings(false);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !pollingPaused) {
        fetchLatestSettings(false);
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [settingsLoaded, pollingPaused]);

  // ---------------------------------------------------------
  // Cross-tab sync via storage events
  // ---------------------------------------------------------
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORE_SETTINGS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.lastUpdated !== lastUpdateTimeRef.current) {
            setStoreSettings(parsed);
            lastUpdateTimeRef.current = parsed.lastUpdated;
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ---------------------------------------------------------
  // Update — local state + DB write
  // ---------------------------------------------------------
  const updateStoreSettings = (settings: Partial<StoreSettings>) => {
    const updated: StoreSettings = {
      ...storeSettings,
      ...settings,
      lastUpdated: new Date().toISOString(),
    };

    if (settings.isOpen === true) {
      updated.closedMessage = '';
      updated.expectedOpenDate = '';
      updated.expectedOpenTime = '';
    }

    // Update local immediately (admin tab feels instant)
    setStoreSettings(updated);
    lastUpdateTimeRef.current = updated.lastUpdated;
    localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(updated));

    // Persist to DB
    db.updateStoreSettings(updated).catch((err) => {
      console.error('updateStoreSettings failed:', err);
    });
  };

  const getIsStoreOpen = (): boolean => {
    if (isLoading || !settingsLoaded) return false;
    return storeSettings.isOpen;
  };

  return (
    <StoreContext.Provider
      value={{
        storeSettings,
        updateStoreSettings,
        isStoreOpen: getIsStoreOpen(),
        isLoading: isLoading || !settingsLoaded,
        setPollingPaused,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};