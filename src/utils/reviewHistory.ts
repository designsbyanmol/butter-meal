// utils/reviewHistory.ts

const BASE_KEY = 'restaurant_reviewed_items';
const PLATFORM_SUFFIX = '__platform';

const tenantKey = (slug: string | null | undefined): string => {
  const safe = slug && slug.trim().length > 0 ? slug.trim() : PLATFORM_SUFFIX;
  return `${BASE_KEY}::${safe}`;
};

type ReviewedMap = Record<number, string>; // itemId → ISO timestamp

const read = (slug: string | null | undefined): ReviewedMap => {
  try {
    const raw = localStorage.getItem(tenantKey(slug));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const write = (slug: string | null | undefined, data: ReviewedMap): void => {
  try {
    localStorage.setItem(tenantKey(slug), JSON.stringify(data));
  } catch {
    /* quota / private mode — ignore */
  }
};

/** Has this device ever reviewed this item (in this tenant)? */
export const hasReviewedLocally = (
  slug: string | null | undefined,
  itemId: number,
): boolean => {
  const map = read(slug);
  return map[itemId] !== undefined;
};

/** Record that this device has reviewed this item. */
export const markReviewedLocally = (
  slug: string | null | undefined,
  itemId: number,
): void => {
  const map = read(slug);
  map[itemId] = new Date().toISOString();
  write(slug, map);
};

/** Optional: forget locally (not used by the app — for debugging only). */
export const forgetReviewedLocally = (
  slug: string | null | undefined,
  itemId: number,
): void => {
  const map = read(slug);
  delete map[itemId];
  write(slug, map);
};