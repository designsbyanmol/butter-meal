// src/pwa/hubStorage.ts

export interface HubEntry {
  slug: string;
  displayName: string;
  url: string;
  iconUrl: string;
  addedAt: string; // ISO
}

const KEY = 'butter_hub:stores:v1';

const read = (): HubEntry[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (list: HubEntry[]): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
};

export const listHubStores = (): HubEntry[] => read();

export const hasHubStore = (slug: string): boolean =>
  read().some((s) => s.slug === slug);

export const addHubStore = (entry: HubEntry): void => {
  const list = read();
  const idx = list.findIndex((s) => s.slug === entry.slug);
  if (idx === -1) list.push(entry);
  else list[idx] = entry;
  write(list);
};

export const removeHubStore = (slug: string): void => {
  write(read().filter((s) => s.slug !== slug));
};

export const clearHub = (): void => {
  write([]);
};