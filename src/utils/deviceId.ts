// utils/deviceId.ts

const KEY = 'restaurant_device_id';

/** Simple 32-bit string hash (DJB2-ish). Not cryptographic. */
const hashString = (s: string): string => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
};

/** Signals identical in normal and incognito mode on the same device. */
const collectFingerprintSignals = (): string => {
  try {
    const nav: any = navigator;
    const scr = typeof window !== 'undefined' ? window.screen : null;

    const parts = [
      nav.userAgent ?? '',
      nav.language ?? '',
      Array.isArray(nav.languages) ? nav.languages.join(',') : '',
      nav.platform ?? '',
      String(nav.hardwareConcurrency ?? ''),
      String(nav.deviceMemory ?? ''),
      String(nav.maxTouchPoints ?? ''),
      scr ? `${scr.width}x${scr.height}x${scr.colorDepth}` : '',
      scr ? `${scr.availWidth}x${scr.availHeight}` : '',
      (() => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
        } catch {
          return '';
        }
      })(),
    ];
    return parts.join('|');
  } catch {
    return 'unknown';
  }
};

export const getDeviceFingerprint = (): string => {
  return hashString(collectFingerprintSignals());
};

export const getDeviceId = (): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    const probe = '__probe__';
    localStorage.setItem(probe, '1');
    const readBack = localStorage.getItem(probe);
    localStorage.removeItem(probe);
    if (readBack !== '1') return null;

    const stored = localStorage.getItem(KEY);
    if (typeof stored === 'string' && stored.length > 0) {
      return stored;
    }

    // Explicitly typed const — no ambiguity, no unions
    const generated: string =
      (crypto as any)?.randomUUID?.() ??
      `dev_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

    localStorage.setItem(KEY, generated);
    return generated;
  } catch {
    return null;
  }
};

export const getEffectiveDeviceId = (): string => {
  const persistent = getDeviceId();
  if (persistent !== null) return persistent;

  const anyWindow = window as any;
  if (
    typeof anyWindow.__inMemoryDeviceId === 'string' &&
    anyWindow.__inMemoryDeviceId.length > 0
  ) {
    return anyWindow.__inMemoryDeviceId;
  }

  const generated: string =
    (crypto as any)?.randomUUID?.() ??
    `mem_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

  anyWindow.__inMemoryDeviceId = generated;
  return generated;
};