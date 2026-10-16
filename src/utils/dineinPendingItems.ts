// src/utils/dineinPendingItems.ts
import { DineinOrderItem } from '../types';

/**
 * A pending item the customer has added to an existing dine-in order
 * but hasn't committed yet. Each item has its own countdown from
 * `addedAt`; the customer can remove it any time before the window
 * elapses. When the window elapses, the commit scheduler sends it
 * to the server via `appendDineinOrderItems`.
 */
export interface PendingItem {
  /** Local id used for the Remove button. */
  pendingId: string;
  /** Server-side order id the item belongs to. */
  orderId: string;
  /** The line item shape the server expects. */
  item: DineinOrderItem;
  /** Epoch ms when the item was added. */
  addedAt: number;
}

const STORAGE_KEY = 'dinein:pending-items:v1';
const EVENT_NAME = 'dinein-pending-items:changed';

/** How long the customer has to remove the item. */
export const PENDING_WINDOW_MS = 60_000;

// ---------------------------------------------------------
// Storage
// ---------------------------------------------------------
const readAll = (): PendingItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is PendingItem =>
        p &&
        typeof p === 'object' &&
        typeof p.pendingId === 'string' &&
        typeof p.orderId === 'string' &&
        typeof p.addedAt === 'number' &&
        p.item &&
        typeof p.item === 'object',
    );
  } catch {
    return [];
  }
};

const writeAll = (list: PendingItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode */
  }
};

const emitChange = () => {
  try {
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
};

const uid = (): string => {
  const c: any = typeof crypto !== 'undefined' ? crypto : null;
  if (c?.randomUUID) return c.randomUUID();
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

// ---------------------------------------------------------
// Public API
// ---------------------------------------------------------

/** Add an item to the pending list for a given order. */
export const addPendingItem = (
  orderId: string,
  item: DineinOrderItem,
): PendingItem => {
  const entry: PendingItem = {
    pendingId: uid(),
    orderId,
    item,
    addedAt: Date.now(),
  };
  const list = [...readAll(), entry];
  writeAll(list);
  emitChange();
  return entry;
};

/** All pending items, unfiltered. */
export const getAllPendingItems = (): PendingItem[] => readAll();

/** Pending items for one order, unfiltered. */
export const getPendingItemsForOrder = (orderId: string): PendingItem[] =>
  readAll().filter((p) => p.orderId === orderId);

/** Remove a pending item by local id. */
export const removePendingItem = (pendingId: string): void => {
  const list = readAll();
  const next = list.filter((p) => p.pendingId !== pendingId);
  if (next.length === list.length) return;
  writeAll(next);
  emitChange();
};

/**
 * Drop a pending item after it has been successfully committed to
 * the server. Same effect as `removePendingItem` but semantically
 * distinct — callers use whichever name matches the context.
 */
export const dropCommittedPendingItem = (pendingId: string): void =>
  removePendingItem(pendingId);

/** Subscribe to add/remove/commit events. Returns an unsubscribe fn. */
export const subscribePendingItems = (handler: () => void): (() => void) => {
  const onLocal = () => handler();
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) handler();
  };
  window.addEventListener(EVENT_NAME, onLocal);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, onLocal);
    window.removeEventListener('storage', onStorage);
  };
};

/** Milliseconds remaining until the item commits. 0 when past. */
export const remainingMs = (p: PendingItem): number =>
  Math.max(0, p.addedAt + PENDING_WINDOW_MS - Date.now());