// src/utils/historyRetention.ts
import { historyRetentionCutoffIso } from '../config/retention';

export const isWithinRetention = (iso: string | null | undefined): boolean => {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return true;
  return t >= new Date(historyRetentionCutoffIso()).getTime();
};

/**
 * Prune an array of rows (local cache or Supabase response) to only
 * those created within the retention window. Preserves order.
 */
export const filterByRetention = <T extends Record<string, any>>(
  rows: T[],
  dateField: keyof T = 'created_at' as keyof T,
): T[] => {
  const cutoff = new Date(historyRetentionCutoffIso()).getTime();
  return rows.filter((r) => {
    const iso = r[dateField];
    if (!iso) return true;
    const t = new Date(iso).getTime();
    return !Number.isFinite(t) || t >= cutoff;
  });
};

/**
 * Prune a localStorage billing-history array in place and re-write it.
 * Safe to call on every mount - it's a no-op if nothing has aged out.
 */
export const pruneLocalBills = (slug: string): void => {
  const key = `billing_history::${slug}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const filtered = filterByRetention(parsed, 'created_at');
    if (filtered.length === parsed.length) return;
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch {
    /* ignore */
  }
};

/**
 * Same for a store-bill cache with camelCase `createdAt`.
 */
export const pruneLocalStoreBills = (slug: string): void => {
  const key = `billing_history::${slug}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const filtered = filterByRetention(parsed, 'createdAt');
    if (filtered.length === parsed.length) return;
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch {
    /* ignore */
  }
};