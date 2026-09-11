// services/database.service.ts
import { User, MenuItem, StoreSettings } from '../types';
import { supabaseService } from './supabase.service';
import { isSupabaseConfigured } from '../config/env';
import { DEFAULT_ADMIN, SEED_USERS } from '../config/credentials';
import { TABLES } from '../config/tables';

const STORE_SETTINGS_KEY = TABLES.STORE_SETTINGS;

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

  // Throttle state for connection-failure logs
  private lastTestFailureAt = 0;
  private lastTestFailureMsg = '';
  private static readonly TEST_FAIL_LOG_THROTTLE_MS = 60_000;

  // Throttle for menu read errors
  private menuErrorLogged = false;

  private constructor() {
    this.useSupabase = isSupabaseConfigured;

    if (this.useSupabase) {
      this.isMaintenanceMode = true;
      this.connectionCheckPromise = this.checkConnectionOnStartup();

      // Self-heal: re-check connection periodically
      this.maintenanceInterval = setInterval(() => {
        this.forceConnectionCheck().catch(() => { /* already throttled */ });
      }, 30_000);

      // Also re-check when the tab regains focus
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

      const itemsPromise = supabaseService.getMenuItems();
      const items = await Promise.race([itemsPromise, timeoutPromise]) as MenuItem[] | null;

      // Success — reset throttle so future failures get logged again
      this.lastTestFailureAt = 0;
      this.lastTestFailureMsg = '';
      return items !== null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const now = Date.now();

      // Only log once per minute per distinct message
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
      this.maintenanceListeners = this.maintenanceListeners.filter(l => l !== listener);
    };
  }

  private notifyMaintenanceListeners(): void {
    this.maintenanceListeners.forEach(listener => listener(this.isMaintenanceMode));
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
    if (this.connectionCheckPromise) {
      return await this.connectionCheckPromise;
    }
    return !this.isMaintenanceMode;
  }

  // ============ HELPERS ============

  private isUuid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }

  // ============ LOCAL STORAGE — MENU ============

  private getLocalMenuItems(): MenuItem[] {
    try {
      const data = localStorage.getItem(this.localStorageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalMenuItems(items: MenuItem[]): void {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(items));
    } catch { /* ignore */ }
  }

  // ============ LOCAL STORAGE — USERS ============

  private getLocalUsers(): User[] {
    try {
      const data = localStorage.getItem(this.localStorageUsersKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalUsers(users: User[]): void {
    try {
      localStorage.setItem(this.localStorageUsersKey, JSON.stringify(users));
    } catch { /* ignore */ }
  }

  // ============ STORE SETTINGS ============

  async getStoreSettings(): Promise<StoreSettings | null> {
  // Supabase is the source of truth when we're connected.
  // Never write the local cache back — that causes the "store won't close" bug.
  if (this.useSupabase && !this.isMaintenanceMode) {
    try {
      const settings = await supabaseService.getStoreSettings();
      if (settings) {
        localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(settings));
        return settings;
      }
    } catch (error) {
      console.error('getStoreSettings failed, using local:', error);
    }
  }
  return this.getStoreSettingsFromLocalStorage();
}

  private getStoreSettingsFromLocalStorage(): StoreSettings | null {
    try {
      const saved = localStorage.getItem(STORE_SETTINGS_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);

      if (parsed.autoOpen || parsed.holiday) {
        let isOpen = parsed.isOpen ?? true;

        if (parsed.autoOpen?.enabled) {
          const now = new Date();
          const currentDay = now.getDay();
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const currentDayName = dayNames[currentDay];
          const selectedDays = parsed.autoOpen?.days || [];
          const isTodaySelected = selectedDays.includes('everyday') || selectedDays.includes(currentDayName);

          if (isTodaySelected && parsed.autoOpen?.date && parsed.autoOpen?.time) {
            const autoOpenTime = new Date(`${parsed.autoOpen.date}T${parsed.autoOpen.time}`);
            const currentTime = now.getTime();

            if (currentTime >= autoOpenTime.getTime()) {
              if (parsed.autoOpen?.closeTime && parsed.autoOpen?.closeDate) {
                const closeTime = new Date(`${parsed.autoOpen.closeDate}T${parsed.autoOpen.closeTime}`);
                isOpen = currentTime < closeTime.getTime();
              } else {
                isOpen = true;
              }
            } else {
              isOpen = false;
            }
          } else {
            isOpen = false;
          }
        }

        if (parsed.holiday?.enabled) isOpen = false;

        const newSettings: StoreSettings = {
          isOpen,
          closedMessage: parsed.closedMessage || (isOpen ? '' : 'Store is currently closed'),
          expectedOpenDate: parsed.autoOpen?.date || '',
          expectedOpenTime: parsed.autoOpen?.time || '',
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
        };

        localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(newSettings));
        return newSettings;
      }

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

  async updateStoreSettings(settings: StoreSettings): Promise<boolean> {
    try {
      localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(settings));

      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const result = await supabaseService.updateStoreSettings(settings);
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

  // In-memory last-known-good menu (survives across reads in the same session)
private lastGoodMenuItems: MenuItem[] | null = null;

async getMenuItems(): Promise<MenuItem[] | null> {
  // When Supabase is configured, always try Supabase first.
  // Do NOT short-circuit to localStorage even if we think we're in maintenance mode,
  // because maintenance mode is a lagging indicator — the connection may be fine now.
  if (this.useSupabase) {
    try {
      const items = await supabaseService.getMenuItems();
      if (items !== null) {
        this.lastGoodMenuItems = items;
        this.saveLocalMenuItems(items);   // cache for offline cold-start
        return items;
      }
    } catch (error) {
      console.error('getMenuItems (Supabase) threw:', error);
    }
  }

  // Supabase genuinely unavailable → return last-known-good from this session,
  // then fall back to persisted cache, then to null.
  if (this.lastGoodMenuItems) {
    return this.lastGoodMenuItems;
  }
  const cached = this.getLocalMenuItems();
  if (cached.length > 0) return cached;
  return this.useSupabase ? null : [];
}

  async getVisibleMenuItems(): Promise<MenuItem[]> {
    const items = await this.getMenuItems();
    if (!items) return [];
    return items.filter(item => item.inStock === true);
  }

  async addMenuItem(item: MenuItem): Promise<MenuItem | null> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const result = await supabaseService.addMenuItem(item);
          if (result) {
            const localItems = this.getLocalMenuItems();
            localItems.push(result);
            this.saveLocalMenuItems(localItems);
            return result;
          }
          // RPC exists but returned null → real error, do NOT corrupt local cache
          console.error('Supabase addMenuItem returned null — aborting (no local fallback while connected).');
          return null;
        } catch (error) {
          console.error('Supabase addMenuItem threw:', error);
          return null; // don't fall through to local either
        }
      }

      // Local-only mode (Supabase not configured or in maintenance)
      const localItems = this.getLocalMenuItems();
      localItems.push(item);
      this.saveLocalMenuItems(localItems);
      return item;
    } catch (error) {
      console.error('addMenuItem failed:', error);
      return null;
    }
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const result = await supabaseService.deleteMenuItem(id);
          if (result) {
            const localItems = this.getLocalMenuItems().filter(i => i.id !== id);
            this.saveLocalMenuItems(localItems);
            return true;
          }
          console.error('Supabase deleteMenuItem returned false — aborting.');
          return false;
        } catch (error) {
          console.error('Supabase deleteMenuItem threw:', error);
          return false;
        }
      }

      const localItems = this.getLocalMenuItems();
      const filtered = localItems.filter(item => item.id !== id);
      if (filtered.length === localItems.length) return false;
      this.saveLocalMenuItems(filtered);
      return true;
    } catch (error) {
      console.error('deleteMenuItem failed:', error);
      return false;
    }
  }

  async updateMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem | null> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const result = await supabaseService.updateMenuItem(id, updates);
          if (result) {
            const localItems = this.getLocalMenuItems();
            const index = localItems.findIndex(i => i.id === id);
            if (index !== -1) localItems[index] = result;
            else localItems.push(result);
            this.saveLocalMenuItems(localItems);
            return result;
          }
          console.error('Supabase updateMenuItem returned null — aborting.');
          return null;
        } catch (error) {
          console.error('Supabase updateMenuItem threw:', error);
          return null;
        }
      }

      // Local-only
      const localItems = this.getLocalMenuItems();
      const index = localItems.findIndex(item => item.id === id);
      if (index === -1) return null;
      localItems[index] = { ...localItems[index], ...updates };
      this.saveLocalMenuItems(localItems);
      return localItems[index];
    } catch (error) {
      console.error('updateMenuItem failed:', error);
      return null;
    }
  }

  async toggleMenuItemStock(id: number): Promise<MenuItem | null> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const result = await supabaseService.toggleMenuItemStock(id);
          if (result) {
            const localItems = this.getLocalMenuItems();
            const index = localItems.findIndex(i => i.id === id);
            if (index !== -1) localItems[index] = result;
            this.saveLocalMenuItems(localItems);
            return result;
          }
          console.error('Supabase toggleMenuItemStock returned null — aborting.');
          return null;
        } catch (error) {
          console.error('Supabase toggleMenuItemStock threw:', error);
          return null;
        }
      }

      const localItems = this.getLocalMenuItems();
      const index = localItems.findIndex(item => item.id === id);
      if (index === -1) return null;
      localItems[index].inStock = !localItems[index].inStock;
      this.saveLocalMenuItems(localItems);
      return localItems[index];
    } catch (error) {
      console.error('toggleMenuItemStock failed:', error);
      return null;
    }
  }

  async bulkUpdateMenuItems(updates: { id: number; inStock: boolean }[]): Promise<MenuItem[]> {
    const updatedItems: MenuItem[] = [];

    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const result = await supabaseService.bulkUpdateMenuItems(updates);
        if (result && result.length > 0) {
          const localItems = this.getLocalMenuItems();
          result.forEach(updated => {
            const index = localItems.findIndex(item => item.id === updated.id);
            if (index !== -1) {
              localItems[index] = updated;
              updatedItems.push(updated);
            }
          });
          this.saveLocalMenuItems(localItems);
          return updatedItems;
        }
      } catch (error) {
        console.error('Supabase bulkUpdateMenuItems threw:', error);
      }
    }

    const localItems = this.getLocalMenuItems();
    updates.forEach(update => {
      const index = localItems.findIndex(item => item.id === update.id);
      if (index !== -1) {
        localItems[index].inStock = update.inStock;
        updatedItems.push(localItems[index]);
      }
    });
    this.saveLocalMenuItems(localItems);
    return updatedItems;
  }

  async reorderMenuItems(orderedIds: number[]): Promise<MenuItem[] | null> {
  if (this.useSupabase && !this.isMaintenanceMode) {
    try {
      const result = await supabaseService.reorderMenuItems(orderedIds);
      if (result) {
        this.saveLocalMenuItems(result);
        return result;
      }
      console.error('Supabase reorderMenuItems returned null — aborting.');
      return null;
    } catch (error) {
      console.error('Supabase reorderMenuItems threw:', error);
      return null;
    }
  }

  // Local-only: reorder the local array
  const localItems = this.getLocalMenuItems();
  const byId = new Map(localItems.map(i => [i.id, i]));
  const reordered: MenuItem[] = [];
  orderedIds.forEach((id, index) => {
    const item = byId.get(id);
    if (item) reordered.push({ ...item, sortOrder: index + 1 });
  });
  // Append any items not in orderedIds
  localItems.forEach(i => {
    if (!orderedIds.includes(i.id)) reordered.push(i);
  });
  this.saveLocalMenuItems(reordered);
  return reordered;
}

  async initializeMenuItems(defaultItems: MenuItem[]): Promise<void> {
  // ✅ In Supabase mode, the DB is the only source of truth for the menu.
  // Never write the seed into localStorage — it makes the cache lie about
  // what's actually on the server.
  if (this.useSupabase && !this.isMaintenanceMode) {
    try {
      const supabaseItems = await supabaseService.getMenuItems();

      // Guard: don't seed if the read failed
      if (supabaseItems === null) {
        console.warn(
          'initializeMenuItems: Supabase read failed — skipping seed to avoid duplicates',
        );
        return;
      }

      // Seed the DB from menuData.ts only when the DB is genuinely empty
      if (supabaseItems.length === 0) {
        for (const item of defaultItems) {
          await supabaseService.addMenuItem(item);
        }
      }
      // If the DB already has items, do nothing — never merge with stale local
      return;
    } catch (error) {
      console.error('initializeMenuItems (Supabase) failed:', error);
      return;
    }
  }

  // Local-only mode (Supabase not configured, or maintenance mode):
  // Safe to seed the cache, since there's no DB to be authoritative.
  const localItems = this.getLocalMenuItems();
  if (localItems.length === 0) {
    this.saveLocalMenuItems(defaultItems);
  }
}

  // ============ USERS ============

  async getUsers(): Promise<User[]> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const supabaseUsers = await supabaseService.getUsers();
        // Trust Supabase even when empty
        this.saveLocalUsers(supabaseUsers);
        return supabaseUsers;
      } catch (error) {
        console.error('getUsers (Supabase) failed, using local:', error);
      }
    }
    return this.getLocalUsers();
  }

  async getUserByPhone(phone: string): Promise<User | null> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const user = await supabaseService.getUserByPhone(phone);
        if (user) {
          // Replace any existing local entry with the same phone (prevents duplicates)
          const localUsers = this.getLocalUsers().filter(u => u.phone !== phone);
          localUsers.push(user);
          this.saveLocalUsers(localUsers);
          return user;
        }
      } catch (error) {
        console.error('getUserByPhone (Supabase) failed:', error);
      }
    }
    return this.getLocalUserByPhone(phone);
  }

  async getUserById(id: string): Promise<User | null> {
    if (this.useSupabase && !this.isMaintenanceMode && this.isUuid(id)) {
      try {
        const user = await supabaseService.getUserById(id);
        if (user) {
          // Replace by id AND by phone to prevent duplicates
          const localUsers = this.getLocalUsers()
            .filter(u => u.id !== id && u.phone !== user.phone);
          localUsers.push(user);
          this.saveLocalUsers(localUsers);
          return user;
        }
      } catch (error) {
        console.error('getUserById (Supabase) failed:', error);
      }
    }
    return this.getLocalUsers().find(u => u.id === id) || null;
  }

  private getLocalUserByPhone(phone: string): User | null {
    const users = this.getLocalUsers();
    return users.find(u => u.phone === phone) || null;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const user = await supabaseService.createUser(userData);
          const localUsers = this.getLocalUsers();
          localUsers.push(user);
          this.saveLocalUsers(localUsers);
          return user;
        } catch (error) {
          console.error('Supabase createUser threw, falling back to local:', error);
        }
      }

      const localUsers = this.getLocalUsers();
      const newUser: User = {
        ...userData,
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      };
      localUsers.push(newUser);
      this.saveLocalUsers(localUsers);
      return newUser;
    } catch (error) {
      console.error('createUser failed:', error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      let updatedUser: User | null = null;

      // Only send UUIDs to Supabase
      if (this.useSupabase && !this.isMaintenanceMode && this.isUuid(id)) {
        try {
          const user = await supabaseService.updateUser(id, updates);
          if (user) updatedUser = user;
          else console.warn('Supabase updateUser returned null');
        } catch (error) {
          console.error('Supabase updateUser threw:', error);
        }
      }

      const localUsers = this.getLocalUsers();
      const index = localUsers.findIndex(u => u.id === id);
      if (index !== -1) {
        localUsers[index] = { ...localUsers[index], ...updates };
        this.saveLocalUsers(localUsers);
        if (!updatedUser) updatedUser = localUsers[index];
      }

      return updatedUser;
    } catch (error) {
      console.error('updateUser failed:', error);
      return null;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode && this.isUuid(id)) {
        try {
          const result = await supabaseService.deleteUser(id);
          if (result) {
            const localUsers = this.getLocalUsers();
            const filtered = localUsers.filter(u => u.id !== id);
            this.saveLocalUsers(filtered);
            return true;
          }
          console.warn('Supabase deleteUser returned false');
        } catch (error) {
          console.error('Supabase deleteUser threw:', error);
        }
      }

      const localUsers = this.getLocalUsers();
      const filtered = localUsers.filter(u => u.id !== id);
      if (filtered.length === localUsers.length) return false;
      this.saveLocalUsers(filtered);
      return true;
    } catch (error) {
      console.error('deleteUser failed:', error);
      return false;
    }
  }

  async toggleUserStatus(id: string): Promise<User | null> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode && this.isUuid(id)) {
        try {
          const user = await supabaseService.toggleUserStatus(id);
          if (user) {
            const localUsers = this.getLocalUsers();
            const index = localUsers.findIndex(u => u.id === id);
            if (index !== -1) {
              localUsers[index] = user;
              this.saveLocalUsers(localUsers);
            }
            return user;
          }
          console.warn('Supabase toggleUserStatus returned null');
        } catch (error) {
          console.error('Supabase toggleUserStatus threw:', error);
        }
      }

      const localUsers = this.getLocalUsers();
      const index = localUsers.findIndex(u => u.id === id);
      if (index === -1) return null;
      localUsers[index].isActive = !localUsers[index].isActive;
      this.saveLocalUsers(localUsers);
      return localUsers[index];
    } catch (error) {
      console.error('toggleUserStatus failed:', error);
      return null;
    }
  }

  async changeUserPassword(id: string, newPassword: string): Promise<boolean> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode && this.isUuid(id)) {
        try {
          const result = await supabaseService.changeUserPassword(id, newPassword);
          if (result) {
            const localUsers = this.getLocalUsers();
            const index = localUsers.findIndex(u => u.id === id);
            if (index !== -1) {
              localUsers[index].password = newPassword;
              this.saveLocalUsers(localUsers);
            }
            return true;
          }
          console.warn('Supabase changeUserPassword returned false');
        } catch (error) {
          console.error('Supabase changeUserPassword threw:', error);
        }
      }

      const localUsers = this.getLocalUsers();
      const index = localUsers.findIndex(u => u.id === id);
      if (index === -1) return false;
      localUsers[index].password = newPassword;
      this.saveLocalUsers(localUsers);
      return true;
    } catch (error) {
      console.error('changeUserPassword failed:', error);
      return false;
    }
  }

  // ============ DEFAULT SEEDING ============

  async initializeDefaultUsers(): Promise<void> {
    // When Supabase is configured + connected, the server is the source of truth.
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const supabaseUsers = await supabaseService.getUsers();
        if (supabaseUsers.length > 0) {
          this.saveLocalUsers(supabaseUsers);
          return;
        }
      } catch (e) {
        console.warn('initializeDefaultUsers: Supabase check failed, falling back', e);
      }
    }

    // Local fallback (dev / offline)
    const localUsers = this.getLocalUsers();
    const adminExists = localUsers.some(u => u.phone === DEFAULT_ADMIN.phone);
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
      this.saveLocalUsers(localUsers);
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