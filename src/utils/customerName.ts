// utils/customerName.ts
import { tenantKey } from './tenantStorage';

const BASE_KEY = 'restaurant_customer_name';
const EVENT = 'customer-name:changed';

/** The tenant slug is stored by TenantContext so we can read it here without React. */
const getSlugFromStorage = (): string | null => {
  try {
    return sessionStorage.getItem('restaurant_tenant_slug');
  } catch {
    return null;
  }
};

const currentKey = (): string =>
  tenantKey(BASE_KEY, getSlugFromStorage());

export const getCustomerName = (): string => {
  try {
    return (localStorage.getItem(currentKey()) ?? '').trim();
  } catch {
    return '';
  }
};

export const setCustomerName = (name: string): void => {
  const trimmed = name.trim();
  const key = currentKey();
  try {
    if (trimmed) localStorage.setItem(key, trimmed);
    else localStorage.removeItem(key);
  } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT));
};

export const subscribeCustomerName = (
  handler: (name: string) => void,
): (() => void) => {
  const onLocal = () => handler(getCustomerName());
  const onStorage = (e: StorageEvent) => {
    if (e.key === currentKey()) handler(getCustomerName());
  };
  window.addEventListener(EVENT, onLocal);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, onLocal);
    window.removeEventListener('storage', onStorage);
  };
};