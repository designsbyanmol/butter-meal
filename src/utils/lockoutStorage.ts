// src/utils/lockoutStorage.ts

const PREFIX = 'tenant_lockout::';

const keyFor = (tenantSlug: string): string => `${PREFIX}${tenantSlug}`;

export const getLockoutUntil = (tenantSlug: string): number | null => {
  if (!tenantSlug) return null;
  try {
    const raw = localStorage.getItem(keyFor(tenantSlug));
    if (!raw) return null;
    const ms = Number(raw);
    if (!Number.isFinite(ms)) {
      localStorage.removeItem(keyFor(tenantSlug));
      return null;
    }
    if (ms <= Date.now()) {
      localStorage.removeItem(keyFor(tenantSlug));
      return null;
    }
    return ms;
  } catch {
    return null;
  }
};

export const setLockoutUntil = (
  tenantSlug: string,
  unlockAtMs: number,
): void => {
  if (!tenantSlug) return;
  try {
    localStorage.setItem(keyFor(tenantSlug), String(unlockAtMs));
  } catch {
    /* ignore */
  }
};

export const clearLockout = (tenantSlug: string): void => {
  if (!tenantSlug) return;
  try {
    localStorage.removeItem(keyFor(tenantSlug));
  } catch {
    /* ignore */
  }
};