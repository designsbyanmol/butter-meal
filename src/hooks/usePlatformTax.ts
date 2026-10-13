// src/hooks/usePlatformTax.ts
import { useEffect, useState } from 'react';
import { supabaseService } from '../services/supabase.service';

let cached: number | null = null;
let inflight: Promise<number> | null = null;

const read = async (): Promise<number> => {
  if (cached !== null) return cached;
  if (!inflight) {
    inflight = supabaseService.getPlatformTaxPercent().then((v) => {
      cached = v;
      inflight = null;
      return v;
    });
  }
  return inflight;
};

/** Reads the platform-wide tax rate (percent). Cached for the session. */
export const usePlatformTax = () => {
  const [taxPercent, setTaxPercent] = useState<number>(cached ?? 0);
  const [isLoading, setIsLoading] = useState<boolean>(cached === null);

  useEffect(() => {
    let cancelled = false;
    read().then((v) => {
      if (cancelled) return;
      setTaxPercent(v);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    cached = null;
    inflight = null;
    const v = await read();
    setTaxPercent(v);
    return v;
  };

  return { taxPercent, isLoading, refresh };
};

/** Called by the platform admin after saving a new rate. */
export const invalidatePlatformTax = () => {
  cached = null;
  inflight = null;
};