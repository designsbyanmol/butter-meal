// src/utils/tenantStorage.ts
const PLATFORM_SUFFIX = '__platform';

export const tenantKey = (
  base: string,
  slug: string | null | undefined,
): string => {
  const safe = slug && slug.trim().length > 0 ? slug.trim() : PLATFORM_SUFFIX;
  return `${base}::${safe}`;
};