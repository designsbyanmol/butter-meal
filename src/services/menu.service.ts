// services/menu.service.ts
import { MenuItem } from "../types";
import { db } from "./database.service";

/**
 * localStorage cache key for a tenant's menu. The cache stores both
 * the fetched items and the tenant's `menu_version` at the time of
 * the fetch. On subsequent loads, comparing the cached version
 * against the tenant's current `menu_version` tells us whether the
 * cache is still valid — no menu fetch needed if it is.
 */
const CACHE_PREFIX = 'menu:cache:v2';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days hard cap

interface MenuCache {
  version: number;
  items: MenuItem[];
  savedAt: number;
}

const cacheKey = (slug: string): string => `${CACHE_PREFIX}::${slug}`;

function readCache(slug: string): MenuCache | null {
  try {
    const raw = localStorage.getItem(cacheKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MenuCache;
    if (
      !parsed ||
      typeof parsed.version !== 'number' ||
      !Array.isArray(parsed.items)
    ) {
      return null;
    }
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(slug: string, version: number, items: MenuItem[]): void {
  try {
    localStorage.setItem(
      cacheKey(slug),
      JSON.stringify({ version, items, savedAt: Date.now() }),
    );
  } catch {
    /* quota / private mode — ignore */
  }
}

function clearCache(slug: string): void {
  try {
    localStorage.removeItem(cacheKey(slug));
  } catch {
    /* ignore */
  }
}

class MenuService {
  private menuItems: MenuItem[] = [];
  private listeners: ((items: MenuItem[]) => void)[] = [];
  private isInitialized: boolean = false;
  private isLoading: boolean = false;
  private pendingReload: boolean = false;
  private initialFetchPromise: Promise<void> | null = null;

  private tenantSlug: string | null = null;

  /** Last version we've confirmed against the server for this slug. */
  private knownVersion: number | null = null;

  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private focusHandler: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;

  // =========================================================
  // Tenant lifecycle
  // =========================================================

  /**
   * Bind the service to a tenant.
   *
   * Behavior:
   *  1. Seed from the local cache synchronously (if present) so the
   *     menu renders without waiting on the network.
   *  2. Kick off a background validation: fetch the tenant's current
   *     `menu_version` and compare against the cached version.
   *  3. If it matches, keep the cached items and stop.
   *  4. If it differs (or the cache is empty), fetch the full menu.
   */
  setTenant(slug: string): void {
    if (this.tenantSlug === slug) return;

    this.tenantSlug = slug;
    this.menuItems = [];
    this.isInitialized = false;
    this.isLoading = false;
    this.pendingReload = false;
    this.knownVersion = null;

    // ---- 1. Synchronous cache seed ----
    const cached = readCache(slug);
    if (cached) {
      this.menuItems = cached.items;
      this.knownVersion = cached.version;
      this.isInitialized = true;
      // Notify subscribers immediately with the cached list.
      this.notifyListeners();
    }

    // ---- 2. Background validation ----
    this.initialFetchPromise = this.validateAndMaybeLoad(cached).catch(
      (err) => {
        console.error('Menu Service initial load failed:', err);
        if (!this.isInitialized) {
          this.isInitialized = true;
          this.notifyListeners();
        }
      },
    );
  }

  /**
   * Fetch the tenant's current `menu_version` and decide whether to
   * keep the cached list or refetch the whole menu.
   */
  private async validateAndMaybeLoad(
    cached: MenuCache | null,
  ): Promise<void> {
    if (!this.tenantSlug) return;
    const slug = this.tenantSlug;

    // One small request: just the version number.
    let freshVersion: number | null = null;
    try {
      freshVersion = await db.getMenuVersion(slug);
    } catch (err) {
      console.warn('menu.service: version check failed:', err);
    }

    // Tenant changed while we were fetching — bail.
    if (this.tenantSlug !== slug) return;

    // Couldn't reach the server: trust the cache if we have one.
    if (freshVersion === null) {
      if (this.isInitialized) {
        this.notifyListeners();
        return;
      }
      // No cache and no server — let the fallback path try a full load.
      await this.loadMenuItems(true);
      return;
    }

    // ---- Cache hit: nothing changed ----
    if (cached && cached.version === freshVersion) {
      this.knownVersion = freshVersion;
      this.isInitialized = true;
      this.notifyListeners();
      return;
    }

    // ---- Cache miss or stale ----
    await this.loadMenuItems(true, freshVersion);
  }

  // =========================================================
  // Load
  // =========================================================

  /**
   * Fetch the full menu.
   *
   * `expectedVersion` is optional. When provided (from the version
   * check), we persist it against the fetched items. When omitted
   * (manual refresh, mutation-triggered reload), we refetch the
   * version after loading.
   */
  private async loadMenuItems(
    force = false,
    expectedVersion?: number,
  ): Promise<void> {
    if (!this.tenantSlug) return;
    if (this.isInitialized && !force) return;

    if (this.isLoading) {
      this.pendingReload = true;
      return;
    }

    const slug = this.tenantSlug;
    this.isLoading = true;
    const wasInitialized = this.isInitialized;

    try {
      const items = await db.getMenuItems(slug);

      if (this.tenantSlug !== slug) {
        this.isLoading = false;
        return;
      }

      const hadItems = this.menuItems.length > 0;
      const gotEmpty = Array.isArray(items) && items.length === 0;

      // When not forcing, refuse to overwrite real data with an empty
      // response. When forcing, trust the response (used after seeding).
      if (hadItems && gotEmpty && !force) {
        console.warn(
          'menu.service: empty response - keeping previous',
          this.menuItems.length,
          'items.',
        );
        if (!wasInitialized) {
          this.isInitialized = true;
          this.notifyListeners();
        }
        return;
      }

      if (Array.isArray(items)) {
        this.menuItems = items;
        this.isInitialized = true;

        // Persist the version against the fetched items so future
        // loads can skip the fetch entirely.
        let versionToStore = expectedVersion;
        if (versionToStore === undefined) {
          // We didn't have a fresh version to hand; read one now.
          try {
            const v = await db.getMenuVersion(slug);
            if (typeof v === 'number') versionToStore = v;
          } catch {
            /* fall through */
          }
        }
        if (typeof versionToStore === 'number') {
          this.knownVersion = versionToStore;
          writeCache(slug, versionToStore, items);
        }

        this.notifyListeners();
      }
    } catch (error) {
      console.error('menu.service loadMenuItems failed:', error);
      if (!this.isInitialized) {
        this.isInitialized = true;
        this.notifyListeners();
      }
    } finally {
      this.isLoading = false;
      if (this.pendingReload) {
        this.pendingReload = false;
        this.loadMenuItems(true).catch(() => {});
      }
    }
  }

  private notifyListeners(): void {
    const snapshot = [...this.menuItems];
    this.listeners.forEach((l) => l(snapshot));
  }

  // =========================================================
  // Subscriptions
  // =========================================================

  subscribe(listener: (items: MenuItem[]) => void): () => void {
    this.listeners.push(listener);

    if (this.isInitialized) {
      listener([...this.menuItems]);
    } else if (this.initialFetchPromise) {
      this.initialFetchPromise
        .then(() => {
          if (this.isInitialized) listener([...this.menuItems]);
        })
        .catch(() => {
          /* already logged */
        });
    }

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // =========================================================
  // Manual refresh / mutation reload
  // =========================================================

  /**
   * Force a full refetch. Bypasses the version check because the
   * caller has explicitly requested fresh data (e.g. after a menu
   * mutation, or from a manual Refresh button).
   */
  async refresh(): Promise<void> {
    this.isLoading = false;
    this.pendingReload = false;
    await this.loadMenuItems(true);
  }

  private async reloadAuthoritative(): Promise<void> {
    if (!this.tenantSlug) return;
    const slug = this.tenantSlug;
    this.isLoading = false;
    this.pendingReload = false;
    try {
      const items = await db.getMenuItems(slug);
      if (this.tenantSlug !== slug) return;
      if (Array.isArray(items)) {
        this.menuItems = items;
        this.isInitialized = true;

        // Refresh the cached version too.
        try {
          const v = await db.getMenuVersion(slug);
          if (typeof v === 'number') {
            this.knownVersion = v;
            writeCache(slug, v, items);
          }
        } catch {
          /* ignore */
        }

        this.notifyListeners();
      }
    } catch (e) {
      console.error('reloadAuthoritative failed:', e);
    }
  }

  // =========================================================
  // Sync (no-op by design)
  // =========================================================

  startSync(_options: { pollMs?: number } = {}): () => void {
    return () => {
      /* no-op */
    };
  }

  stopSync(): void {
    if (this.focusHandler && typeof window !== "undefined") {
      window.removeEventListener("focus", this.focusHandler);
      this.focusHandler = null;
    }
    if (this.visibilityHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // =========================================================
  // Reads
  // =========================================================

  async getVisibleItems(): Promise<MenuItem[]> {
    if (!this.isInitialized && this.initialFetchPromise) {
      await this.initialFetchPromise;
    }
    return this.menuItems.filter((item) => item.inStock === true);
  }

  async getAllItems(): Promise<MenuItem[]> {
    if (!this.isInitialized && this.initialFetchPromise) {
      await this.initialFetchPromise;
    }
    return [...this.menuItems];
  }

  getItemById(id: number): MenuItem | undefined {
    return this.menuItems.find((item) => item.id === id);
  }

  // =========================================================
  // WRITE METHODS
  // =========================================================

  async addItem(newItem: Omit<MenuItem, "id">): Promise<MenuItem | null> {
    if (!this.tenantSlug) return null;

    const maxId = this.menuItems.reduce(
      (max, item) => Math.max(max, item.id),
      0,
    );
    const itemWithId: MenuItem = { ...newItem, id: maxId + 1 };

    const added = await db.addMenuItem(this.tenantSlug, itemWithId);
    await this.reloadAuthoritative();
    return added;
  }

  async deleteItem(itemId: number): Promise<boolean> {
    if (!this.tenantSlug) return false;
    const deleted = await db.deleteMenuItem(this.tenantSlug, itemId);
    await this.reloadAuthoritative();
    return deleted;
  }

  async toggleItemStock(itemId: number): Promise<MenuItem | null> {
    if (!this.tenantSlug) return null;
    const updated = await db.toggleMenuItemStock(this.tenantSlug, itemId);
    await this.reloadAuthoritative();
    return updated;
  }

  async updateItem(
    itemId: number,
    updates: Partial<MenuItem>,
  ): Promise<MenuItem | null> {
    if (!this.tenantSlug) return null;
    const updated = await db.updateMenuItem(this.tenantSlug, itemId, updates);
    await this.reloadAuthoritative();
    return updated;
  }

  async bulkUpdateStock(
    items: { id: number; inStock: boolean }[],
  ): Promise<MenuItem[]> {
    if (!this.tenantSlug) return [];
    const updated = await db.bulkUpdateMenuItems(this.tenantSlug, items);
    await this.reloadAuthoritative();
    return updated;
  }

  async reorderItems(orderedIds: number[]): Promise<MenuItem[] | null> {
    if (!this.tenantSlug) return null;
    const result = await db.reorderMenuItems(this.tenantSlug, orderedIds);
    await this.reloadAuthoritative();
    return result;
  }

  async initializeItems(defaultItems: MenuItem[]): Promise<void> {
    if (!this.tenantSlug) return;

    // If we already have a valid cache, skip the seed check entirely.
    // The version check in setTenant has already confirmed the menu
    // is up to date — there's nothing to initialize.
    if (this.isInitialized && this.menuItems.length > 0) {
      return;
    }

    await db.initializeMenuItems(this.tenantSlug, defaultItems);
    await this.loadMenuItems(true);
  }

  /**
   * Replace the entire menu for the current tenant with the given
   * sample items. Deletes every existing item first, then inserts the
   * samples. Returns the number of items inserted.
   *
   * Destructive - caller must confirm with the user before invoking.
   */
  async replaceWithSampleItems(defaultItems: MenuItem[]): Promise<number> {
    if (!this.tenantSlug) return 0;
    if (!Array.isArray(defaultItems) || defaultItems.length === 0) return 0;

    const slug = this.tenantSlug;

    const existingIds = this.menuItems.map((it) => it.id);

    for (const id of existingIds) {
      const ok = await db.deleteMenuItem(slug, id);
      if (!ok) {
        console.warn(`replaceWithSampleItems: failed to delete id=${id}`);
      }
    }

    let inserted = 0;
    for (const item of defaultItems) {
      const created = await this.addItem(item);
      if (created) inserted += 1;
    }

    await this.reloadAuthoritative();
    return inserted;
  }

  // =========================================================
  // Cache control
  // =========================================================

  /** Force-clear the cached menu for a tenant. */
  clearTenantCache(slug?: string): void {
    const target = slug ?? this.tenantSlug;
    if (!target) return;
    clearCache(target);
    if (target === this.tenantSlug) {
      this.knownVersion = null;
    }
  }
}

export const menuService = new MenuService();