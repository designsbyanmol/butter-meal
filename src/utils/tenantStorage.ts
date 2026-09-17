// utils/tenantStorage.ts
const PLATFORM_SUFFIX = '__platform';

/**
 * Return a localStorage key namespaced by the current tenant slug.
 * Used so carts, preferences, and names never cross-contaminate
 * between stores on the same browser.
 */
export const tenantKey = (base: string, slug: string | null | undefined): string => {
  const safe = slug && slug.trim().length > 0 ? slug.trim() : PLATFORM_SUFFIX;
  return `${base}::${safe}`;
};