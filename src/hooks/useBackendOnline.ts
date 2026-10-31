// src/hooks/useBackendOnline.ts
import { useEffect, useState } from 'react';
import { db } from '../services/database.service';

/**
 * Returns `true` while the backend (Supabase) is reachable and
 * `false` while `db` is in maintenance / disconnected mode.
 *
 * Defaults to `true` so we never flash "Reconnecting..." before the
 * first ping completes.
 */
export const useBackendOnline = (): boolean => {
  const [online, setOnline] = useState<boolean>(
    () => !db.isInMaintenanceMode(),
  );

  useEffect(() => {
    return db.subscribeToMaintenance((isDown) => setOnline(!isDown));
  }, []);

  return online;
};