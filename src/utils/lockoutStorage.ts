// src/utils/lockoutStorage.ts

const PREFIX = 'tenant_lockout::';

/**
 * Key is scoped per tenant slug so a lockout at Store A doesn't block
 * Store B on the same browser.
 */
const keyFor = (tenantSlug: string): string => `${PREFIX}${tenantSlug}`;

/**
 * Returns the unlock timestamp (ms since epoch) if the tenant is
 * currently locked, or `null` if it's not locked / already expired.
 * Auto-prunes expired entries.
 */
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

/**
 * Marks the tenant as locked until `unlockAtMs`. Called by
 * `LoginModal` when the server returns a lockout error.
 */
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

/** Manual clear (not usually needed - entries auto-expire). */
export const clearLockout = (tenantSlug: string): void => {
  if (!tenantSlug) return;
  try {
    localStorage.removeItem(keyFor(tenantSlug));
  } catch {
    /* ignore */
  }
};