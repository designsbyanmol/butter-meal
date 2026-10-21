// src/contexts/StoreContext.tsx
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
import { useTenant } from './TenantContext';

interface StoreContextType {
  storeSettings: StoreSettings;
  updateStoreSettings: (settings: Partial<StoreSettings>) => void;
  isStoreOpen: boolean;
  isLoading: boolean;
  isAcceptingOrders: boolean;
  setPollingPaused: (paused: boolean) => void;
}

const defaultStoreSettings: StoreSettings = {
  isOpen: true,
  closedMessage: '',
  expectedOpenDate: '',
  expectedOpenTime: '',
  acceptingOrders: true,
  lastUpdated: new Date().toISOString(),
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { tenant, isLoading: tenantLoading } = useTenant();

  const [storeSettings, setStoreSettings] =
    useState<StoreSettings>(defaultStoreSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [pollingPaused, setPollingPaused] = useState(false);

  const lastUpdateTimeRef = useRef<string>('');
  const isFetchingRef = useRef(false);

  const fetchLatestSettings = async (
    force = false,
  ): Promise<StoreSettings | null> => {
    if (!tenant) return null;
    if (isFetchingRef.current && !force) return null;
    if (pollingPaused && !force) return null;

    const slug = tenant.slug;

    try {
      isFetchingRef.current = true;
      const dbSettings = await db.getStoreSettings(slug);
      if (!dbSettings) {
        isFetchingRef.current = false;
        return null;
      }

      const latest: StoreSettings = {
        isOpen: dbSettings.isOpen ?? true,
        closedMessage: dbSettings.closedMessage || '',
        expectedOpenDate: dbSettings.expectedOpenDate || '',
        expectedOpenTime: dbSettings.expectedOpenTime || '',
        acceptingOrders: dbSettings.acceptingOrders !== false,
        lastUpdated: dbSettings.lastUpdated || new Date().toISOString(),
      };

      if (latest.lastUpdated !== lastUpdateTimeRef.current) {
        setStoreSettings(latest);
        lastUpdateTimeRef.current = latest.lastUpdated;
      }
      isFetchingRef.current = false;
      return latest;
    } catch (error) {
      console.error('fetchLatestSettings failed:', error);
      isFetchingRef.current = false;
      return null;
    }
  };

  useEffect(() => {
    if (tenantLoading) return;

    if (!tenant) {
      setStoreSettings(defaultStoreSettings);
      setSettingsLoaded(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setSettingsLoaded(false);
    lastUpdateTimeRef.current = '';

    (async () => {
      await fetchLatestSettings(true);
      setSettingsLoaded(true);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug, tenantLoading]);

  const updateStoreSettings = (settings: Partial<StoreSettings>) => {
    if (!tenant) return;

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

    setStoreSettings(updated);
    lastUpdateTimeRef.current = updated.lastUpdated;

    db.updateStoreSettings(tenant.slug, updated).catch((err: unknown) => {
      console.error('updateStoreSettings failed:', err);
    });
  };

  const getIsStoreOpen = (): boolean => {
    if (isLoading || !settingsLoaded) return false;
    if (!tenant) return false;
    return storeSettings.isOpen;
  };

  const getIsAcceptingOrders = (): boolean => {
    if (isLoading || !settingsLoaded) return false;
    if (!tenant) return false;
    return storeSettings.acceptingOrders;
  };

  return (
    <StoreContext.Provider
      value={{
        storeSettings,
        updateStoreSettings,
        isStoreOpen: getIsStoreOpen(),
        isAcceptingOrders: getIsAcceptingOrders(),
        isLoading: isLoading || !settingsLoaded,
        setPollingPaused,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};