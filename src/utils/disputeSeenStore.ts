// src/utils/disputeSeenStore.ts
import { tenantKey } from './tenantStorage';

const BASE_KEY = 'platform:seen-disputes:v1';

/**
 * Storage scope:
 *   - null / undefined / ''  →  '__platform'  (platform admin bell)
 *   - '<slug>'               →  per-tenant    (tenant admin bell)
 *
 * This prevents the platform admin's seen-set from colliding with each
 * tenant admin's seen-set, and prevents two tenants from sharing state.
 */
const keyFor = (scope: string | null | undefined): string =>
  tenantKey(BASE_KEY, scope);

const readSet = (scope: string | null | undefined): Set<string> => {
  try {
    const raw = localStorage.getItem(keyFor(scope));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
};

const writeSet = (scope: string | null | undefined, s: Set<string>) => {
  try {
    localStorage.setItem(keyFor(scope), JSON.stringify(Array.from(s)));
  } catch {
    /* ignore quota / private mode */
  }
};

/** Read the seen-dispute ID set for the given scope. */
export const getSeenDisputes = (
  scope: string | null | undefined,
): Set<string> => readSet(scope);

/** Mark a single dispute as seen within the given scope. */
export const markDisputeSeen = (
  scope: string | null | undefined,
  id: string,
): void => {
  const s = readSet(scope);
  if (!s.has(id)) {
    s.add(id);
    writeSet(scope, s);
  }
};

/** Mark many disputes as seen within the given scope. */
export const markDisputesSeen = (
  scope: string | null | undefined,
  ids: string[],
): void => {
  const s = readSet(scope);
  let changed = false;
  ids.forEach((id) => {
    if (!s.has(id)) {
      s.add(id);
      changed = true;
    }
  });
  if (changed) writeSet(scope, s);
};