// services/database.service.ts
import { User, MenuItem, StoreSettings } from '../types';
import { supabaseService } from './supabase.service';
import { isSupabaseConfigured } from '../config/env';
import { DEFAULT_ADMIN, SEED_USERS } from '../config/credentials';
import { TABLES } from '../config/tables';

const STORE_SETTINGS_KEY = TABLES.STORE_SETTINGS;
const TENANT_SLUG_KEY = 'restaurant_tenant_slug';

class DatabaseService {
  private static instance: DatabaseService;
  private useSupabase: boolean;
  private isMaintenanceMode: boolean = false;
  private localStorageKey = TABLES.MENU;
  private localStorageUsersKey = TABLES.USERS;
  private maintenanceListeners: ((isActive: boolean) => void)[] = [];
  private connectionChecked: boolean = false;
  private connectionCheckPromise: Promise<boolean> | null = null;
  private maintenanceInterval: ReturnType<typeof setInterval> | null = null;

  private lastTestFailureAt = 0;
  private lastTestFailureMsg = '';
  private static readonly TEST_FAIL_LOG_THROTTLE_MS = 60_000;

  private menuErrorLogged = false;

  private constructor() {
    this.useSupabase = isSupabaseConfigured;

    if (this.useSupabase) {
      this.isMaintenanceMode = false;
      this.connectionCheckPromise = this.checkConnectionOnStartup();

      this.maintenanceInterval = setInterval(() => {
        this.forceConnectionCheck().catch(() => { /* throttled */ });
      }, 30_000);

      if (typeof window !== 'undefined') {
        window.addEventListener('focus', () => {
          this.forceConnectionCheck().catch(() => { /* ignore */ });
        });
      }
    } else {
      this.isMaintenanceMode = false;
      this.connectionChecked = true;
    }
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // ============ TENANT KEY HELPERS ============
  // localStorage keys are namespaced per tenant so two tenants never
  // share cache accidentally.

  private tenantKey(base: string, tenantSlug: string): string {
    return `${base}::${tenantSlug}`;
  }

  // ============ CONNECTION / MAINTENANCE ============

  private async checkConnectionOnStartup(): Promise<boolean> {
    const isConnected = await this.testConnection();
    this.isMaintenanceMode = !isConnected;
    this.connectionChecked = true;
    this.notifyMaintenanceListeners();
    return isConnected;
  }

  private async testConnection(): Promise<boolean> {
    if (!this.useSupabase) return false;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      const slug =
        (typeof sessionStorage !== 'undefined' &&
          sessionStorage.getItem(TENANT_SLUG_KEY)) ||
        'main';

      const itemsPromise = supabaseService.getMenuItems(slug);
      const items = await Promise.race([itemsPromise, timeoutPromise]) as
        | MenuItem[]
        | null;

      this.lastTestFailureAt = 0;
      this.lastTestFailureMsg = '';
      return items !== null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const now = Date.now();

      if (
        msg !== this.lastTestFailureMsg ||
        now - this.lastTestFailureAt > DatabaseService.TEST_FAIL_LOG_THROTTLE_MS
      ) {
        console.warn('Supabase unreachable — using cached data:', msg);
        this.lastTestFailureAt = now;
        this.lastTestFailureMsg = msg;
      }
      return false;
    }
  }

  subscribeToMaintenance(listener: (isActive: boolean) => void): () => void {
    this.maintenanceListeners.push(listener);
    listener(this.isMaintenanceMode);
    return () => {
      this.maintenanceListeners = this.maintenanceListeners.filter(
        (l) => l !== listener,
      );
    };
  }

  private notifyMaintenanceListeners(): void {
    this.maintenanceListeners.forEach((l) => l(this.isMaintenanceMode));
  }

  public isInMaintenanceMode(): boolean {
    return this.isMaintenanceMode;
  }

  public getMaintenanceStatus(): { isActive: boolean; message: string } {
    return {
      isActive: this.isMaintenanceMode,
      message: this.isMaintenanceMode
        ? 'We are under some problem. Please connect after sometime.'
        : '',
    };
  }

  async forceConnectionCheck(): Promise<boolean> {
    if (!this.useSupabase) return false;
    const isConnected = await this.testConnection();
    const changed = this.isMaintenanceMode !== !isConnected;
    this.isMaintenanceMode = !isConnected;
    if (changed) this.notifyMaintenanceListeners();
    return isConnected;
  }

  async waitForConnectionCheck(): Promise<boolean> {
    if (this.connectionCheckPromise) return await this.connectionCheckPromise;
    return !this.isMaintenanceMode;
  }

  // ============ HELPERS ============

  private isUuid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    );
  }

  // ============ LOCAL STORAGE — MENU (per tenant) ============

  private getLocalMenuItems(tenantSlug: string): MenuItem[] {
    try {
      const key = this.tenantKey(this.localStorageKey, tenantSlug);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalMenuItems(tenantSlug: string, items: MenuItem[]): void {
    try {
      const key = this.tenantKey(this.localStorageKey, tenantSlug);
      localStorage.setItem(key, JSON.stringify(items));
    } catch { /* ignore */ }
  }

  // ============ LOCAL STORAGE — USERS (per tenant) ============

  private getLocalUsers(tenantSlug: string): User[] {
    try {
      const key = this.tenantKey(this.localStorageUsersKey, tenantSlug);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalUsers(tenantSlug: string, users: User[]): void {
    try {
      const key = this.tenantKey(this.localStorageUsersKey, tenantSlug);
      localStorage.setItem(key, JSON.stringify(users));
    } catch { /* ignore */ }
  }

  // ============ LOCAL STORAGE — STORE SETTINGS (per tenant) ============

  private getStoreSettingsKey(tenantSlug: string): string {
    return this.tenantKey(STORE_SETTINGS_KEY, tenantSlug);
  }

  // ============ STORE SETTINGS ============

  async getStoreSettings(tenantSlug: string): Promise<StoreSettings | null> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const settings = await supabaseService.getStoreSettings(tenantSlug);
        if (settings) {
          localStorage.setItem(
            this.getStoreSettingsKey(tenantSlug),
            JSON.stringify(settings),
          );
          return settings;
        }
      } catch (error) {
        console.error('getStoreSettings failed, using local:', error);
      }
    }
    return this.getStoreSettingsFromLocalStorage(tenantSlug);
  }

  private getStoreSettingsFromLocalStorage(
    tenantSlug: string,
  ): StoreSettings | null {
    try {
      const saved = localStorage.getItem(this.getStoreSettingsKey(tenantSlug));
      if (!saved) return null;
      const parsed = JSON.parse(saved);

      return {
        isOpen: parsed.isOpen ?? true,
        closedMessage: parsed.closedMessage || '',
        expectedOpenDate: parsed.expectedOpenDate || '',
        expectedOpenTime: parsed.expectedOpenTime || '',
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };
    } catch (error) {
      console.error('getStoreSettingsFromLocalStorage failed:', error);
      return null;
    }
  }

  async updateStoreSettings(
    tenantSlug: string,
    settings: StoreSettings,
  ): Promise<boolean> {
    try {
      localStorage.setItem(
        this.getStoreSettingsKey(tenantSlug),
        JSON.stringify(settings),
      );

      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const result = await supabaseService.updateStoreSettings(
            tenantSlug,
            settings,
          );
          if (!result) console.warn('Supabase updateStoreSettings returned false');
        } catch (error) {
          console.error('Supabase updateStoreSettings threw:', error);
        }
      }
      return true;
    } catch (error) {
      console.error('updateStoreSettings failed:', error);
      return false;
    }
  }

  // ============ MENU ITEMS ============

  async getMenuItems(tenantSlug: string): Promise<MenuItem[] | null> {
    if (this.useSupabase) {
      try {
        const items = await supabaseService.getMenuItems(tenantSlug);
        if (items !== null) {
          this.menuErrorLogged = false;
          this.saveLocalMenuItems(tenantSlug, items);
          return items;
        }
      } catch (error) {
        console.error('getMenuItems (Supabase) threw:', error);
      }

      if (!this.menuErrorLogged) {
        console.warn('getMenuItems returned null — using local cache');
        this.menuErrorLogged = true;
      }
    }

    const cached = this.getLocalMenuItems(tenantSlug);
    if (cached.length > 0) return cached;
    return this.useSupabase ? null : [];
  }

  async getVisibleMenuItems(tenantSlug: string): Promise<MenuItem[]> {
    const items = await this.getMenuItems(tenantSlug);
    if (!items) return [];
    return items.filter((item) => item.inStock === true);
  }

  async addMenuItem(
    tenantSlug: string,
    item: MenuItem,
  ): Promise<MenuItem | null> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const result = await supabaseService.addMenuItem(tenantSlug, item);
          if (result) {
            const localItems = this.getLocalMenuItems(tenantSlug);
            localItems.push(result);
            this.saveLocalMenuItems(tenantSlug, localItems);
            return result;
          }
          console.error('Supabase addMenuItem returned null — aborting.');
          return null;
        } catch (error) {
          console.error('Supabase addMenuItem threw:', error);
          return null;
        }
      }

      const localItems = this.getLocalMenuItems(tenantSlug);
      localItems.push(item);
      this.saveLocalMenuItems(tenantSlug, localItems);
      return item;
    } catch (error) {
      console.error('addMenuItem failed:', error);
      return null;
    }
  }

  async deleteMenuItem(tenantSlug: string, id: number): Promise<boolean> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const result = await supabaseService.deleteMenuItem(tenantSlug, id);
          if (result) {
            const localItems = this.getLocalMenuItems(tenantSlug).filter(
              (i) => i.id !== id,
            );
            this.saveLocalMenuItems(tenantSlug, localItems);
            return true;
          }
          console.error('Supabase deleteMenuItem returned false — aborting.');
          return false;
        } catch (error) {
          console.error('Supabase deleteMenuItem threw:', error);
          return false;
        }
      }

      const localItems = this.getLocalMenuItems(tenantSlug);
      const filtered = localItems.filter((item) => item.id !== id);
      if (filtered.length === localItems.length) return false;
      this.saveLocalMenuItems(tenantSlug, filtered);
      return true;
    } catch (error) {
      console.error('deleteMenuItem failed:', error);
      return false;
    }
  }

  async updateMenuItem(
    tenantSlug: string,
    id: number,
    updates: Partial<MenuItem>,
  ): Promise<MenuItem | null> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const result = await supabaseService.updateMenuItem(
            tenantSlug,
            id,
            updates,
          );
          if (result) {
            const localItems = this.getLocalMenuItems(tenantSlug);
            const index = localItems.findIndex((i) => i.id === id);
            if (index !== -1) localItems[index] = result;
            else localItems.push(result);
            this.saveLocalMenuItems(tenantSlug, localItems);
            return result;
          }
          console.error('Supabase updateMenuItem returned null — aborting.');
          return null;
        } catch (error) {
          console.error('Supabase updateMenuItem threw:', error);
          return null;
        }
      }

      const localItems = this.getLocalMenuItems(tenantSlug);
      const index = localItems.findIndex((item) => item.id === id);
      if (index === -1) return null;
      localItems[index] = { ...localItems[index], ...updates };
      this.saveLocalMenuItems(tenantSlug, localItems);
      return localItems[index];
    } catch (error) {
      console.error('updateMenuItem failed:', error);
      return null;
    }
  }

  async toggleMenuItemStock(
    tenantSlug: string,
    id: number,
  ): Promise<MenuItem | null> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const result = await supabaseService.toggleMenuItemStock(
            tenantSlug,
            id,
          );
          if (result) {
            const localItems = this.getLocalMenuItems(tenantSlug);
            const index = localItems.findIndex((i) => i.id === id);
            if (index !== -1) localItems[index] = result;
            this.saveLocalMenuItems(tenantSlug, localItems);
            return result;
          }
          console.error('Supabase toggleMenuItemStock returned null — aborting.');
          return null;
        } catch (error) {
          console.error('Supabase toggleMenuItemStock threw:', error);
          return null;
        }
      }

      const localItems = this.getLocalMenuItems(tenantSlug);
      const index = localItems.findIndex((item) => item.id === id);
      if (index === -1) return null;
      localItems[index].inStock = !localItems[index].inStock;
      this.saveLocalMenuItems(tenantSlug, localItems);
      return localItems[index];
    } catch (error) {
      console.error('toggleMenuItemStock failed:', error);
      return null;
    }
  }

  async bulkUpdateMenuItems(
    tenantSlug: string,
    updates: { id: number; inStock: boolean }[],
  ): Promise<MenuItem[]> {
    const updatedItems: MenuItem[] = [];

    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const results = await Promise.all(
          updates.map((u) =>
            supabaseService.updateMenuItem(tenantSlug, u.id, {
              inStock: u.inStock,
            }),
          ),
        );
        const ok = results.filter((r): r is MenuItem => !!r);
        if (ok.length > 0) {
          const localItems = this.getLocalMenuItems(tenantSlug);
          ok.forEach((updated) => {
            const index = localItems.findIndex((item) => item.id === updated.id);
            if (index !== -1) localItems[index] = updated;
            updatedItems.push(updated);
          });
          this.saveLocalMenuItems(tenantSlug, localItems);
          return updatedItems;
        }
      } catch (error) {
        console.error('Supabase bulkUpdateMenuItems threw:', error);
      }
    }

    const localItems = this.getLocalMenuItems(tenantSlug);
    updates.forEach((update) => {
      const index = localItems.findIndex((item) => item.id === update.id);
      if (index !== -1) {
        localItems[index].inStock = update.inStock;
        updatedItems.push(localItems[index]);
      }
    });
    this.saveLocalMenuItems(tenantSlug, localItems);
    return updatedItems;
  }

  async reorderMenuItems(
    tenantSlug: string,
    orderedIds: number[],
  ): Promise<MenuItem[] | null> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const result = await supabaseService.reorderMenuItems(
          tenantSlug,
          orderedIds,
        );
        if (result) {
          this.saveLocalMenuItems(tenantSlug, result);
          return result;
        }
        console.error('Supabase reorderMenuItems returned null — aborting.');
        return null;
      } catch (error) {
        console.error('Supabase reorderMenuItems threw:', error);
        return null;
      }
    }

    const localItems = this.getLocalMenuItems(tenantSlug);
    const byId = new Map(localItems.map((i) => [i.id, i]));
    const reordered: MenuItem[] = [];
    orderedIds.forEach((id, index) => {
      const item = byId.get(id);
      if (item) reordered.push({ ...item, sortOrder: index + 1 });
    });
    localItems.forEach((i) => {
      if (!orderedIds.includes(i.id)) reordered.push(i);
    });
    this.saveLocalMenuItems(tenantSlug, reordered);
    return reordered;
  }

  async initializeMenuItems(
    tenantSlug: string,
    defaultItems: MenuItem[],
  ): Promise<void> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const supabaseItems = await supabaseService.getMenuItems(tenantSlug);

        if (supabaseItems === null) {
          console.warn(
            'initializeMenuItems: Supabase read failed — skipping seed',
          );
          return;
        }

        if (supabaseItems.length === 0) {
          for (const item of defaultItems) {
            await supabaseService.addMenuItem(tenantSlug, item);
          }
        }
        return;
      } catch (error) {
        console.error('initializeMenuItems (Supabase) failed:', error);
        return;
      }
    }

    const localItems = this.getLocalMenuItems(tenantSlug);
    if (localItems.length === 0) {
      this.saveLocalMenuItems(tenantSlug, defaultItems);
    }
  }

  // ============ USERS ============

  async getUsers(tenantSlug: string): Promise<User[]> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const supabaseUsers = await supabaseService.getUsers(tenantSlug);
        this.saveLocalUsers(tenantSlug, supabaseUsers);
        return supabaseUsers;
      } catch (error) {
        console.error('getUsers (Supabase) failed, using local:', error);
      }
    }
    return this.getLocalUsers(tenantSlug);
  }

  async getUserByPhone(
    tenantSlug: string,
    phone: string,
  ): Promise<User | null> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const user = await supabaseService.getUserByPhone(tenantSlug, phone);
        if (user) {
          const localUsers = this.getLocalUsers(tenantSlug).filter(
            (u) => u.phone !== phone,
          );
          localUsers.push(user);
          this.saveLocalUsers(tenantSlug, localUsers);
          return user;
        }
      } catch (error) {
        console.error('getUserByPhone (Supabase) failed:', error);
      }
    }
    return (
      this.getLocalUsers(tenantSlug).find((u) => u.phone === phone) || null
    );
  }

  async getUserById(tenantSlug: string, id: string): Promise<User | null> {
  if (this.useSupabase && !this.isMaintenanceMode && this.isUuid(id)) {
    try {
      const user = await supabaseService.getUserById(id);   // ✅ matches the new method
      if (user) {
        const localUsers = this.getLocalUsers(tenantSlug).filter(
          (u) => u.id !== id && u.phone !== user.phone,
        );
        localUsers.push(user);
        this.saveLocalUsers(tenantSlug, localUsers);
        return user;
      }
    } catch (error) {
      console.error('getUserById (Supabase) failed:', error);
    }
  }
  return this.getLocalUsers(tenantSlug).find((u) => u.id === id) || null;
}

  async createUser(
    tenantSlug: string,
    userData: Omit<User, 'id' | 'createdAt'>,
  ): Promise<User> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const user = await supabaseService.createUser(tenantSlug, userData);
          const localUsers = this.getLocalUsers(tenantSlug);
          localUsers.push(user);
          this.saveLocalUsers(tenantSlug, localUsers);
          return user;
        } catch (error) {
          console.error('Supabase createUser threw, falling back to local:', error);
        }
      }

      const localUsers = this.getLocalUsers(tenantSlug);
      const newUser: User = {
        ...userData,
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      };
      localUsers.push(newUser);
      this.saveLocalUsers(tenantSlug, localUsers);
      return newUser;
    } catch (error) {
      console.error('createUser failed:', error);
      throw error;
    }
  }

  async updateUser(
    tenantSlug: string,
    id: string,
    updates: Partial<User>,
  ): Promise<User | null> {
    try {
      let updatedUser: User | null = null;

      if (this.useSupabase && !this.isMaintenanceMode && this.isUuid(id)) {
        try {
          const user = await supabaseService.updateUser(id, updates);
          if (user) updatedUser = user;
          else console.warn('Supabase updateUser returned null');
        } catch (error) {
          console.error('Supabase updateUser threw:', error);
        }
      }

      const localUsers = this.getLocalUsers(tenantSlug);
      const index = localUsers.findIndex((u) => u.id === id);
      if (index !== -1) {
        localUsers[index] = { ...localUsers[index], ...updates };
        this.saveLocalUsers(tenantSlug, localUsers);
        if (!updatedUser) updatedUser = localUsers[index];
      }
      return updatedUser;
    } catch (error) {
      console.error('updateUser failed:', error);
      return null;
    }
  }

  async deleteUser(tenantSlug: string, id: string): Promise<boolean> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode && this.isUuid(id)) {
        try {
          const result = await supabaseService.deleteUser(id);
          if (result) {
            const localUsers = this.getLocalUsers(tenantSlug).filter(
              (u) => u.id !== id,
            );
            this.saveLocalUsers(tenantSlug, localUsers);
            return true;
          }
          console.warn('Supabase deleteUser returned false');
        } catch (error) {
          console.error('Supabase deleteUser threw:', error);
        }
      }

      const localUsers = this.getLocalUsers(tenantSlug);
      const filtered = localUsers.filter((u) => u.id !== id);
      if (filtered.length === localUsers.length) return false;
      this.saveLocalUsers(tenantSlug, filtered);
      return true;
    } catch (error) {
      console.error('deleteUser failed:', error);
      return false;
    }
  }

  async toggleUserStatus(
    tenantSlug: string,
    id: string,
  ): Promise<User | null> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode && this.isUuid(id)) {
        try {
          const user = await supabaseService.toggleUserStatus(id);
          if (user) {
            const localUsers = this.getLocalUsers(tenantSlug);
            const index = localUsers.findIndex((u) => u.id === id);
            if (index !== -1) {
              localUsers[index] = user;
              this.saveLocalUsers(tenantSlug, localUsers);
            }
            return user;
          }
          console.warn('Supabase toggleUserStatus returned null');
        } catch (error) {
          console.error('Supabase toggleUserStatus threw:', error);
        }
      }

      const localUsers = this.getLocalUsers(tenantSlug);
      const index = localUsers.findIndex((u) => u.id === id);
      if (index === -1) return null;
      localUsers[index].isActive = !localUsers[index].isActive;
      this.saveLocalUsers(tenantSlug, localUsers);
      return localUsers[index];
    } catch (error) {
      console.error('toggleUserStatus failed:', error);
      return null;
    }
  }

  async changeUserPassword(
    tenantSlug: string,
    id: string,
    newPassword: string,
  ): Promise<boolean> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode && this.isUuid(id)) {
        try {
          const result = await supabaseService.changeUserPassword(
            id,
            newPassword,
          );
          if (result) {
            const localUsers = this.getLocalUsers(tenantSlug);
            const index = localUsers.findIndex((u) => u.id === id);
            if (index !== -1) {
              localUsers[index].password = newPassword;
              this.saveLocalUsers(tenantSlug, localUsers);
            }
            return true;
          }
          console.warn('Supabase changeUserPassword returned false');
        } catch (error) {
          console.error('Supabase changeUserPassword threw:', error);
        }
      }

      const localUsers = this.getLocalUsers(tenantSlug);
      const index = localUsers.findIndex((u) => u.id === id);
      if (index === -1) return false;
      localUsers[index].password = newPassword;
      this.saveLocalUsers(tenantSlug, localUsers);
      return true;
    } catch (error) {
      console.error('changeUserPassword failed:', error);
      return false;
    }
  }

  // ============ DEFAULT SEEDING ============

  async initializeDefaultUsers(tenantSlug: string): Promise<void> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const supabaseUsers = await supabaseService.getUsers(tenantSlug);
        if (supabaseUsers.length > 0) {
          this.saveLocalUsers(tenantSlug, supabaseUsers);
          return;
        }
      } catch (e) {
        console.warn('initializeDefaultUsers: Supabase check failed', e);
      }
    }

    if (tenantSlug === 'main') {
      const localUsers = this.getLocalUsers(tenantSlug);
      const adminExists = localUsers.some(
        (u) => u.phone === DEFAULT_ADMIN.phone,
      );
      if (!adminExists) {
        const adminUser: User = {
          id: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          phone: DEFAULT_ADMIN.phone,
          name: DEFAULT_ADMIN.name,
          password: DEFAULT_ADMIN.password,
          role: DEFAULT_ADMIN.role,
          isActive: DEFAULT_ADMIN.isActive,
          createdAt: new Date().toISOString(),
        };
        localUsers.push(adminUser);
        for (const seedUser of SEED_USERS) {
          localUsers.push({
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            phone: seedUser.phone,
            name: seedUser.name,
            password: seedUser.password,
            role: seedUser.role,
            isActive: seedUser.isActive,
            createdAt: new Date().toISOString(),
          });
        }
        this.saveLocalUsers(tenantSlug, localUsers);
      }
    }
  }

  // ============ OPTIONAL CLEANUP ============

  public destroy(): void {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }
  }
}

export const db = DatabaseService.getInstance();