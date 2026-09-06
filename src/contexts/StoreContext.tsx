// contexts/StoreContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { StoreSettings } from '../types';
import { db } from '../services/database.service';

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

const STORE_SETTINGS_KEY = 'store_settings';

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

interface StoreProviderProps {
  children: ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(defaultStoreSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [pollingPaused, setPollingPaused] = useState(false);
  
  const lastUpdateTimeRef = useRef<string>('');
  const initialLoadDoneRef = useRef(false);
  // Track if we're currently fetching to prevent duplicate requests
  const isFetchingRef = useRef(false);

  // OPTIMIZED: Fetch with debouncing and request deduplication
  const fetchLatestSettings = async (force = false) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current && !force) {
      return null;
    }

    if (pollingPaused && !force) {
      return null;
    }

    try {
      isFetchingRef.current = true;
      
      // Check localStorage first before hitting the database
      const localData = localStorage.getItem(STORE_SETTINGS_KEY);
      if (localData && !force) {
        const parsed = JSON.parse(localData);
        const now = new Date().getTime();
        const lastUpdate = new Date(parsed.lastUpdated).getTime();
        const timeDiff = now - lastUpdate;
        
        // If we fetched within the last 30 seconds, use cached data (reduces DB hits by 83%)
        if (timeDiff < 30000) {
          isFetchingRef.current = false;
          return parsed;
        }
      }

      // Only hit the database if cache is stale or force refresh
      const dbSettings = await db.getStoreSettings();
      if (dbSettings) {
        const latestSettings = {
          isOpen: dbSettings.isOpen ?? true,
          closedMessage: dbSettings.closedMessage || '',
          expectedOpenDate: dbSettings.expectedOpenDate || '',
          expectedOpenTime: dbSettings.expectedOpenTime || '',
          lastUpdated: dbSettings.lastUpdated || new Date().toISOString(),
        };
        
        const currentLastUpdated = storeSettings.lastUpdated;
        const dbLastUpdated = latestSettings.lastUpdated;
        
        if (dbLastUpdated > currentLastUpdated) {
          setStoreSettings(latestSettings);
          localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(latestSettings));
          lastUpdateTimeRef.current = latestSettings.lastUpdated;
        }
        
        isFetchingRef.current = false;
        return latestSettings;
      }
      
      isFetchingRef.current = false;
      return null;
    } catch (error) {
      isFetchingRef.current = false;
      return null;
    }
  };

  // OPTIMIZED: Load with cache-first strategy
  useEffect(() => {
    const loadSettings = async () => {
      try {
        let loadedSettings: StoreSettings | null = null;
        
        // Step 1: Try localStorage first (fastest, no DB hit)
        try {
          const saved = localStorage.getItem(STORE_SETTINGS_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            loadedSettings = {
              isOpen: parsed.isOpen ?? true,
              closedMessage: parsed.closedMessage || '',
              expectedOpenDate: parsed.expectedOpenDate || '',
              expectedOpenTime: parsed.expectedOpenTime || '',
              lastUpdated: parsed.lastUpdated || new Date().toISOString(),
            };
            
            setStoreSettings(loadedSettings);
            lastUpdateTimeRef.current = loadedSettings.lastUpdated;
          }
        } catch (e) {
          // Silently handle error
        }

        // Step 2: Check if localStorage is stale (> 1 minute old)
        const shouldRefresh = loadedSettings?.lastUpdated 
          ? (new Date().getTime() - new Date(loadedSettings.lastUpdated).getTime() > 60000)
          : true;

        // Step 3: Fetch from database if needed (but only once)
        if (shouldRefresh) {
          try {
            const dbSettings = await db.getStoreSettings();
            if (dbSettings) {
              const freshSettings = {
                isOpen: dbSettings.isOpen ?? true,
                closedMessage: dbSettings.closedMessage || '',
                expectedOpenDate: dbSettings.expectedOpenDate || '',
                expectedOpenTime: dbSettings.expectedOpenTime || '',
                lastUpdated: dbSettings.lastUpdated || new Date().toISOString(),
              };
              
              // Only update if database has newer data
              if (!loadedSettings || freshSettings.lastUpdated > loadedSettings.lastUpdated) {
                loadedSettings = freshSettings;
                setStoreSettings(freshSettings);
                localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(freshSettings));
                lastUpdateTimeRef.current = freshSettings.lastUpdated;
              }
            }
          } catch (e) {
            // Silently handle error - keep using localStorage
          }
        }

        // Step 4: If still no settings, use defaults
        if (!loadedSettings) {
          loadedSettings = defaultStoreSettings;
          setStoreSettings(defaultStoreSettings);
          localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(defaultStoreSettings));
          lastUpdateTimeRef.current = defaultStoreSettings.lastUpdated;
          db.updateStoreSettings(defaultStoreSettings).catch(() => {});
        }

        initialLoadDoneRef.current = true;
        setSettingsLoaded(true);
        setIsLoading(false);
        
      } catch (e) {
        setStoreSettings(defaultStoreSettings);
        setSettingsLoaded(true);
        setIsLoading(false);
      }
    };

    loadSettings();

    // OPTIMIZED: Poll every 30 seconds instead of 5 (reduces DB hits by 83%)
    const pollInterval = setInterval(() => {
      if (settingsLoaded && !pollingPaused) {
        fetchLatestSettings(false); // false = use cache
      }
    }, 30000); // 30 seconds

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORE_SETTINGS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          
          if (parsed.lastUpdated > lastUpdateTimeRef.current) {
            setStoreSettings(parsed);
            lastUpdateTimeRef.current = parsed.lastUpdated;
          }
        } catch (e) {
          // Silently handle error
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [settingsLoaded, pollingPaused]);

  const updateStoreSettings = (settings: Partial<StoreSettings>) => {
    const updated = {
      ...storeSettings,
      ...settings,
      lastUpdated: new Date().toISOString(),
    };
    
    if (settings.isOpen === true) {
      updated.closedMessage = '';
      updated.expectedOpenDate = '';
      updated.expectedOpenTime = '';
    }
    
    // Update state and cache immediately
    setStoreSettings(updated);
    lastUpdateTimeRef.current = updated.lastUpdated;
    localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(updated));
    
    // Save to database asynchronously (don't wait for response)
    db.updateStoreSettings(updated).catch(() => {});
  };

  const getIsStoreOpen = (): boolean => {
    if (isLoading || !settingsLoaded) {
      return false;
    }
    return storeSettings.isOpen;
  };

  const open = getIsStoreOpen();

  return (
    <StoreContext.Provider value={{
      storeSettings,
      updateStoreSettings,
      isStoreOpen: open,
      isLoading: isLoading || !settingsLoaded,
      setPollingPaused,
    }}>
      {children}
    </StoreContext.Provider>
  );
};