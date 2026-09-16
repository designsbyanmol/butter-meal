// utils/customerName.ts
const STORAGE_KEY = 'restaurant_customer_name';
const EVENT = 'customer-name:changed';

export const getCustomerName = (): string => {
  try {
    return (localStorage.getItem(STORAGE_KEY) ?? '').trim();
  } catch {
    return '';
  }
};

export const setCustomerName = (name: string): void => {
  const trimmed = name.trim();
  try {
    if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
};

export const subscribeCustomerName = (
  handler: (name: string) => void,
): (() => void) => {
  const onLocal = () => handler(getCustomerName());
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) handler(getCustomerName());
  };
  window.addEventListener(EVENT, onLocal);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, onLocal);
    window.removeEventListener('storage', onStorage);
  };
};