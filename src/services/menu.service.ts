// services/menu.service.ts
import { MenuItem } from "../types";
import { db } from "./database.service";

class MenuService {
  private menuItems: MenuItem[] = [];
  private listeners: ((items: MenuItem[]) => void)[] = [];
  private isInitialized: boolean = false;
  private isLoading: boolean = false;
  private pendingReload: boolean = false;
  private initialFetchPromise: Promise<void> | null = null;

  private tenantSlug: string | null = null;

  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private focusHandler: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;

  // Set which tenant this service is operating on.
  // Clears cached state and refetches.
  setTenant(slug: string): void {
    if (this.tenantSlug === slug) return;

    this.tenantSlug = slug;
    this.menuItems = [];
    this.isInitialized = false;
    this.isLoading = false;
    this.pendingReload = false;
    this.initialFetchPromise = this.loadMenuItems(true).catch((err) => {
      console.error("Menu Service initial load failed:", err);
    });

    // Notify subscribers immediately with the empty list so the UI shows
    // the skeleton instead of stale data from the previous tenant.
    this.notifyListeners();
  }

  private async loadMenuItems(force = false): Promise<void> {
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
        this.notifyListeners();
      }
    } catch (e) {
      console.error("reloadAuthoritative failed:", e);
    }
  }

  /**
   * No-op by default. Polling and focus/visibility refetches are disabled
   * so the customer end makes no network calls while a tab is idle.
   * Data is fetched on mount (via setTenant) or on manual refresh.
   */
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
  // WRITE METHODS - every mutation passes the tenant slug
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
    await db.initializeMenuItems(this.tenantSlug, defaultItems);
    // Force a refetch so subscribers receive the freshly-seeded items.
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

    // 1. Snapshot the current ids so we don't rely on state that may
    //    mutate while we're deleting.
    const existingIds = this.menuItems.map((it) => it.id);

    // 2. Delete every current item.
    for (const id of existingIds) {
      const ok = await db.deleteMenuItem(slug, id);
      if (!ok) {
        // A single failure shouldn't abort the whole wipe; log and continue.
        console.warn(`replaceWithSampleItems: failed to delete id=${id}`);
      }
    }

    // 3. Insert the samples one by one. addItem assigns fresh ids.
    let inserted = 0;
    for (const item of defaultItems) {
      const created = await this.addItem(item);
      if (created) inserted += 1;
    }

    // 4. Sync listeners.
    await this.reloadAuthoritative();
    return inserted;
  }
}

export const menuService = new MenuService();
