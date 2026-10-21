// hooks/useRazorpayScript.ts
import { useEffect, useState } from 'react';

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let loaderPromise: Promise<boolean> | null = null;

const loadScript = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector(
      `script[src="${SCRIPT_URL}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const s = document.createElement('script');
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  return loaderPromise;
};

export const useRazorpayScript = () => {
  const [ready, setReady] = useState<boolean>(
    typeof window !== 'undefined' && !!(window as any).Razorpay,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadScript().then((ok) => {
      if (cancelled) return;
      setReady(ok);
      if (!ok) setError('Failed to load Razorpay script');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, error };
};