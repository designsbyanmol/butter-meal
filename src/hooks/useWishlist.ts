// hooks/useWishlist.ts
import { useCallback, useEffect, useState } from 'react';
import { MenuItem } from '../types';
import { useTenant } from '../contexts/TenantContext';

const STORAGE_PREFIX = 'restaurant_wishlist';
const EVENT_NAME = 'wishlist:changed';

/** Per-tenant key so switching stores never mixes wishlists. */
const keyFor = (slug: string) => `${STORAGE_PREFIX}::${slug}`;

/** id → snapshot of the item at time of saving */
type WishlistRecord = Record<number, MenuItem>;

function read(slug: string): WishlistRecord {
  try {
    const raw = localStorage.getItem(keyFor(slug));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function write(slug: string, data: WishlistRecord): void {
  try {
    localStorage.setItem(keyFor(slug), JSON.stringify(data));
  } catch {
    /* quota / private mode — ignore */
  }
}

export const useWishlist = () => {
  const { tenant } = useTenant();
  const slug = tenant?.slug ?? null;

  const [record, setRecord] = useState<WishlistRecord>(() =>
    slug ? read(slug) : {},
  );

  // Re-load whenever the tenant changes
  useEffect(() => {
    setRecord(slug ? read(slug) : {});
  }, [slug]);

  // Listen to storage changes from other tabs + custom in-tab event
  useEffect(() => {
    if (!slug) return;

    const reload = () => setRecord(read(slug));

    const onStorage = (e: StorageEvent) => {
      if (e.key === keyFor(slug)) reload();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(EVENT_NAME, reload);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(EVENT_NAME, reload);
    };
  }, [slug]);

  /** Persist to localStorage + broadcast + update state. */
  const commit = useCallback(
    (next: WishlistRecord) => {
      if (!slug) return;
      write(slug, next);
      setRecord(next);
      window.dispatchEvent(new Event(EVENT_NAME));
    },
    [slug],
  );

  // --------------------------------------------------------------
  // toggle uses the FUNCTIONAL form of setState so it always sees
  // the freshest `record` — no stale-closure bug, even from memoized
  // child components that captured an old `toggle` reference.
  // --------------------------------------------------------------
  const toggle = useCallback(
    (item: MenuItem) => {
      if (!slug) return;

      setRecord((current) => {
        const next = { ...current };

        if (next[item.id]) {
          delete next[item.id];
        } else {
          next[item.id] = item;
        }

        write(slug, next);
        // Defer broadcast so listeners reading localStorage get fresh data
        queueMicrotask(() => {
          window.dispatchEvent(new Event(EVENT_NAME));
        });

        return next;
      });
    },
    [slug],
  );

  const remove = useCallback(
    (id: number) => {
      if (!slug) return;

      setRecord((current) => {
        if (!current[id]) return current;

        const next = { ...current };
        delete next[id];

        write(slug, next);
        queueMicrotask(() => {
          window.dispatchEvent(new Event(EVENT_NAME));
        });

        return next;
      });
    },
    [slug],
  );

  const clear = useCallback(() => {
    if (!slug) return;
    commit({});
  }, [slug, commit]);

  // --------------------------------------------------------------
  // Cheap, non-memoized helpers — fine because MenuItem is memoized
  // on `isWishlisted` (a boolean) not on the function identity.
  // --------------------------------------------------------------
  const isWishlisted = (id: number) => record[id] !== undefined;
  const has = (id: number) => record[id] !== undefined;

  /** Array form for rendering. Newest first. */
  const items = Object.values(record).sort((a, b) => b.id - a.id);

  return {
    items,
    count: items.length,
    isWishlisted,
    has,
    toggle,
    remove,
    clear,
  };
};