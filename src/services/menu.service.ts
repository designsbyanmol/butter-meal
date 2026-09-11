// services/menu.service.ts
import { MenuItem } from '../types';
import { db } from './database.service';

class MenuService {
  private menuItems: MenuItem[] = [];
  private listeners: ((items: MenuItem[]) => void)[] = [];
  private isInitialized: boolean = false;

  // Prevents overlapping loads
  private isLoading: boolean = false;
  private pendingReload: boolean = false;

  // Track the first fetch so callers can await it
  private initialFetchPromise: Promise<void>;

  // Sync handles
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private focusHandler: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;

  constructor() {
    // Kick off the first load immediately and remember the promise
    this.initialFetchPromise = this.loadMenuItems().catch((err) => {
      console.error('menu.service initial load failed:', err);
    });
  }

  // =========================================================
  // CORE LOAD
  // =========================================================

  private async loadMenuItems(): Promise<void> {
    if (this.isLoading) {
      this.pendingReload = true;
      return;
    }

    this.isLoading = true;
    const wasInitialized = this.isInitialized;

    try {
      const items = await db.getMenuItems();

      // Guard: never wipe a good list with an empty response
      const hadItems = this.menuItems.length > 0;
      const gotEmpty = Array.isArray(items) && items.length === 0;

      if (hadItems && gotEmpty) {
        console.warn(
          'menu.service: Supabase returned empty — keeping previous',
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
        this.loadMenuItems().catch(() => {
          /* handled inside */
        });
      }
    }
  }

  private notifyListeners(): void {
    const snapshot = [...this.menuItems];
    this.listeners.forEach((l) => l(snapshot));
  }

  // =========================================================
  // SUBSCRIPTION — never emits stale data before first fetch
  // =========================================================

  subscribe(listener: (items: MenuItem[]) => void): () => void {
    this.listeners.push(listener);

    if (this.isInitialized) {
      // Fresh data is already available — hand it over immediately
      listener([...this.menuItems]);
    } else {
      // Wait for the first fetch to complete, then hand over the fresh list
      this.initialFetchPromise
        .then(() => {
          if (this.isInitialized) {
            listener([...this.menuItems]);
          }
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
  // PUBLIC REFRESH
  // =========================================================

  /**
   * Force a real reload, ignoring the empty-guard so admins can
   * see truth even if the previous state was non-empty.
   */
  async refresh(): Promise<void> {
    this.isLoading = false;
    this.pendingReload = false;
    await this.loadMenuItems();
  }

  /**
   * Hard refresh that bypasses the empty-guard — used after writes so
   * the list always reflects what the DB actually has.
   */
  private async reloadAuthoritative(): Promise<void> {
    this.isLoading = false;
    this.pendingReload = false;
    try {
      const items = await db.getMenuItems();
      if (Array.isArray(items)) {
        this.menuItems = items;
        this.isInitialized = true;
        this.notifyListeners();
      }
    } catch (e) {
      console.error('reloadAuthoritative failed:', e);
    }
  }

  // =========================================================
  // SYNC (polling + focus + visibility)
  // =========================================================

  /**
   * Start automatic synchronization.
   * @param options.pollMs  Polling interval in ms (default 30000).
   *                        Pass 0 to disable polling.
   * @returns               A stop function.
   */
  startSync(options: { pollMs?: number } = {}): () => void {
    const pollMs = options.pollMs ?? 30_000;

    if (typeof window !== 'undefined') {
      if (!this.focusHandler) {
        this.focusHandler = () => {
          this.loadMenuItems().catch(() => {
            /* handled inside */
          });
        };
        window.addEventListener('focus', this.focusHandler);
      }

      if (!this.visibilityHandler) {
        this.visibilityHandler = () => {
          if (document.visibilityState === 'visible') {
            this.loadMenuItems().catch(() => {
              /* handled inside */
            });
          }
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);
      }
    }

    if (pollMs > 0 && !this.pollInterval) {
      this.pollInterval = setInterval(() => {
        this.loadMenuItems().catch(() => {
          /* handled inside */
        });
      }, pollMs);
    }

    return () => this.stopSync();
  }

  stopSync(): void {
    if (this.focusHandler && typeof window !== 'undefined') {
      window.removeEventListener('focus', this.focusHandler);
      this.focusHandler = null;
    }
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // =========================================================
  // READ METHODS
  // =========================================================

  async getVisibleItems(): Promise<MenuItem[]> {
    if (!this.isInitialized) {
      await this.initialFetchPromise;
    }
    return this.menuItems.filter((item) => item.inStock === true);
  }

  async getAllItems(): Promise<MenuItem[]> {
    if (!this.isInitialized) {
      await this.initialFetchPromise;
    }
    return [...this.menuItems];
  }

  getItemById(id: number): MenuItem | undefined {
    return this.menuItems.find((item) => item.id === id);
  }

  // =========================================================
  // WRITE METHODS — always reload from source after mutation
  // =========================================================

  async addItem(newItem: Omit<MenuItem, 'id'>): Promise<MenuItem | null> {
    // Compute id only as a hint; Supabase SERIAL assigns the real one
    const maxId = this.menuItems.reduce((max, item) => Math.max(max, item.id), 0);
    const itemWithId: MenuItem = { ...newItem, id: maxId + 1 };

    const added = await db.addMenuItem(itemWithId);
    // Whether added is null or not, re-sync from source so both
    // Supabase and localStorage stay consistent.
    await this.reloadAuthoritative();
    return added;
  }

  async deleteItem(itemId: number): Promise<boolean> {
    const deleted = await db.deleteMenuItem(itemId);
    await this.reloadAuthoritative();
    return deleted;
  }

  async toggleItemStock(itemId: number): Promise<MenuItem | null> {
    const updated = await db.toggleMenuItemStock(itemId);
    await this.reloadAuthoritative();
    return updated;
  }

  async updateItem(
    itemId: number,
    updates: Partial<MenuItem>,
  ): Promise<MenuItem | null> {
    const updated = await db.updateMenuItem(itemId, updates);
    await this.reloadAuthoritative();
    return updated;
  }

  async bulkUpdateStock(
    items: { id: number; inStock: boolean }[],
  ): Promise<MenuItem[]> {
    const updated = await db.bulkUpdateMenuItems(items);
    await this.reloadAuthoritative();
    return updated;
  }

  async reorderItems(orderedIds: number[]): Promise<MenuItem[] | null> {
    const result = await db.reorderMenuItems(orderedIds);
    await this.reloadAuthoritative();
    return result;
  }

  async initializeItems(defaultItems: MenuItem[]): Promise<void> {
    await db.initializeMenuItems(defaultItems);
    await this.loadMenuItems();
  }
}

export const menuService = new MenuService();