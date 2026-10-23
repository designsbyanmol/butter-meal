// src/contexts/StoreContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import { StoreSettings } from "../types";
import { db } from "../services/database.service";
import { useTenant } from "./TenantContext";

interface StoreContextType {
  storeSettings: StoreSettings;
  updateStoreSettings: (settings: Partial<StoreSettings>) => Promise<void>;
  refreshStoreSettings: () => Promise<void>;
  isStoreOpen: boolean;
  isLoading: boolean;
  isAcceptingOrders: boolean;
  setPollingPaused: (paused: boolean) => void;
}

const defaultStoreSettings: StoreSettings = {
  isOpen: true,
  closedMessage: "",
  expectedOpenDate: "",
  expectedOpenTime: "",
  acceptingOrders: true,
  lastUpdated: new Date().toISOString(),
};

const POLL_INTERVAL_MS = 60_000;

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
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
  const [pollingPaused, setPollingPausedState] = useState(false);

  const lastUpdateTimeRef = useRef<string>("");
  const isFetchingRef = useRef(false);
  const storeSettingsRef = useRef<StoreSettings>(storeSettings);

  useEffect(() => {
    storeSettingsRef.current = storeSettings;
  }, [storeSettings]);

  const setPollingPaused = useCallback((paused: boolean) => {
    setPollingPausedState(paused);
  }, []);

  const fetchLatestSettings = useCallback(
    async (force = false): Promise<StoreSettings | null> => {
      if (!tenant) return null;
      if (isFetchingRef.current && !force) return null;
      if (pollingPaused && !force) return null;

      const slug = tenant.slug;

      try {
        isFetchingRef.current = true;
        const dbSettings = await db.getStoreSettings(slug);
        if (!dbSettings) {
          return null;
        }

        const latest: StoreSettings = {
          isOpen: dbSettings.isOpen ?? true,
          closedMessage: dbSettings.closedMessage || "",
          expectedOpenDate: dbSettings.expectedOpenDate || "",
          expectedOpenTime: dbSettings.expectedOpenTime || "",
          acceptingOrders: dbSettings.acceptingOrders !== false,
          lastUpdated: dbSettings.lastUpdated || new Date().toISOString(),
        };

        // Always apply on a forced fetch; otherwise only when changed.
        if (force || latest.lastUpdated !== lastUpdateTimeRef.current) {
          setStoreSettings(latest);
          storeSettingsRef.current = latest;
          lastUpdateTimeRef.current = latest.lastUpdated;
        }
        return latest;
      } catch (error) {
        console.error("fetchLatestSettings failed:", error);
        return null;
      } finally {
        isFetchingRef.current = false;
      }
    },
    [tenant, pollingPaused],
  );

  // ---------------------------------------------------------
  // Initial load / tenant switch
  // ---------------------------------------------------------
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
    lastUpdateTimeRef.current = "";

    (async () => {
      await fetchLatestSettings(true);
      setSettingsLoaded(true);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug, tenantLoading]);

  // ---------------------------------------------------------
  // Live polling — every 60s while visible, immediate on focus.
  // Paused entirely while the tab is hidden.
  // ---------------------------------------------------------
  useEffect(() => {
    if (tenantLoading) return;
    if (!tenant) return;
    if (isLoading) return;
    if (!settingsLoaded) return;

    let cancelled = false;
    let timer: number | null = null;

    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      // force=false → respects `pollingPaused`
      await fetchLatestSettings(false);
    };

    const schedule = () => {
      if (cancelled) return;
      timer = window.setTimeout(async () => {
        await tick();
        schedule();
      }, POLL_INTERVAL_MS);
    };

    schedule();

    // Focus / visibility → refresh now, restart the timer.
    const onFocus = () => {
      if (document.hidden) return;
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      tick().finally(schedule);
    };

    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug, tenantLoading, isLoading, settingsLoaded]);

  // ---------------------------------------------------------
  // Writes — optimistic + rollback on failure.
  // ---------------------------------------------------------
  const updateStoreSettings = useCallback(
    async (settings: Partial<StoreSettings>): Promise<void> => {
      if (!tenant) throw new Error("No tenant loaded");

      const previous = storeSettingsRef.current;

      const updated: StoreSettings = {
        ...previous,
        ...settings,
        lastUpdated: new Date().toISOString(),
      };

      // Opening the store clears the closed-state details.
      if (settings.isOpen === true) {
        updated.closedMessage = "";
        updated.expectedOpenDate = "";
        updated.expectedOpenTime = "";
      }

      // Optimistic update — UI reflects change immediately.
      setStoreSettings(updated);
      storeSettingsRef.current = updated;
      lastUpdateTimeRef.current = updated.lastUpdated;

      try {
        await db.updateStoreSettings(tenant.slug, updated);
      } catch (err) {
        console.error("updateStoreSettings failed:", err);
        // Roll back to the last known-good state.
        setStoreSettings(previous);
        storeSettingsRef.current = previous;
        lastUpdateTimeRef.current = previous.lastUpdated;
        throw err;
      }
    },
    [tenant],
  );

  const refreshStoreSettings = useCallback(async (): Promise<void> => {
    await fetchLatestSettings(true);
  }, [fetchLatestSettings]);

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
        refreshStoreSettings,
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