// services/credentialCache.ts

const STORAGE_KEY = 'admin_generated_passwords_v1';

interface CachedPassword {
  password: string;
  generatedAt: string; // ISO timestamp
}

type CacheMap = Record<string, CachedPassword>;

function readCache(): CacheMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(map: CacheMap): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota errors */
  }
}

export const credentialCache = {
  /** Returns the cached password entry for a tenant, or null if none. */
  get(slug: string): CachedPassword | null {
    const map = readCache();
    return map[slug] ?? null;
  },

  /** Stores a password for a tenant, timestamping the generation. */
  set(slug: string, password: string): void {
    const map = readCache();
    map[slug] = {
      password,
      generatedAt: new Date().toISOString(),
    };
    writeCache(map);
  },

  /** Removes the cached password for a tenant. */
  remove(slug: string): void {
    const map = readCache();
    if (slug in map) {
      delete map[slug];
      writeCache(map);
    }
  },

  /** Clears all cached passwords. Called on admin logout. */
  clearAll(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },

  /** Returns the ISO timestamp of when the password was generated, or null. */
  getGeneratedAt(slug: string): string | null {
    const entry = this.get(slug);
    return entry?.generatedAt ?? null;
  },
};