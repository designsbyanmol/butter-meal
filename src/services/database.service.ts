// services/database.service.ts
import { User, MenuItem, StoreSettings } from '../types';
import { supabaseService } from './supabase.service';
import { isSupabaseConfigured } from '../config/env';
import { DEFAULT_ADMIN, SEED_USERS } from '../config/credentials';

const STORE_SETTINGS_KEY = 'store_settings';

class DatabaseService {
  private static instance: DatabaseService;
  private useSupabase: boolean;
  private isMaintenanceMode: boolean = true;
  private localStorageKey = 'restaurant_menu_data';
  private localStorageUsersKey = 'restaurant_users_data';
  private maintenanceListeners: ((isActive: boolean) => void)[] = [];
  private connectionChecked: boolean = false;
  private connectionCheckPromise: Promise<boolean> | null = null;

  private constructor() {
    this.useSupabase = isSupabaseConfigured;
    
    if (this.useSupabase) {
      this.isMaintenanceMode = true;
      this.connectionCheckPromise = this.checkConnectionOnStartup();
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
      const items = await Promise.race([itemsPromise, timeoutPromise]) as MenuItem[];
      
      if (Array.isArray(items)) {
        return true;
      }
      
      return false;
    } catch (error: any) {
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
        : ''
    };
  }

  async forceConnectionCheck(): Promise<boolean> {
    if (!this.useSupabase) return false;
    
    const isConnected = await this.testConnection();
    this.isMaintenanceMode = !isConnected;
    this.notifyMaintenanceListeners();
    return isConnected;
  }

  async waitForConnectionCheck(): Promise<boolean> {
    if (this.connectionCheckPromise) {
      return await this.connectionCheckPromise;
    }
    return !this.isMaintenanceMode;
  }

  // ============ LOCAL STORAGE METHODS ============

  private getLocalMenuItems(): MenuItem[] {
    try {
      const data = localStorage.getItem(this.localStorageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  private saveLocalMenuItems(items: MenuItem[]): void {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(items));
    } catch (error) {
      // Silently handle error
    }
  }

  private getLocalUsers(): User[] {
    try {
      const data = localStorage.getItem(this.localStorageUsersKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  private saveLocalUsers(users: User[]): void {
    try {
      localStorage.setItem(this.localStorageUsersKey, JSON.stringify(users));
    } catch (error) {
      // Silently handle error
    }
  }

  // ============ STORE SETTINGS METHODS ============

  async getStoreSettings(): Promise<StoreSettings | null> {
  
  // ALWAYS try Supabase first (source of truth)
  if (this.useSupabase && !this.isMaintenanceMode) {
    try {
      const settings = await supabaseService.getStoreSettings();
      if (settings) {
        
        // Get local cached version
        const localSettings = this.getStoreSettingsFromLocalStorage();
        
        // Compare timestamps - use the newest one
        if (localSettings && localSettings.lastUpdated) {
          const dbTime = new Date(settings.lastUpdated).getTime();
          const localTime = new Date(localSettings.lastUpdated).getTime();
          
          if (localTime > dbTime) {
            await this.updateStoreSettings(localSettings);
            return localSettings;
          }
        }
        
        // Cache in localStorage for offline fallback
        localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(settings));
        return settings;
      } else {
        console.log('ℹ️ No store settings found in Supabase');
      }
    } catch (error) {
      return this.getStoreSettingsFromLocalStorage();
    }
  }

  return this.getStoreSettingsFromLocalStorage();
}

  private getStoreSettingsFromLocalStorage(): StoreSettings | null {
    try {
      const saved = localStorage.getItem(STORE_SETTINGS_KEY);
      if (saved) {
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
                  if (currentTime < closeTime.getTime()) {
                    isOpen = true;
                  } else {
                    isOpen = false;
                  }
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
          
          if (parsed.holiday?.enabled) {
            isOpen = false;
          }
          
          const newSettings = {
            isOpen: isOpen,
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
      }
    } catch (error) {
      // Silently handle error
    }
    return null;
  }

  async updateStoreSettings(settings: StoreSettings): Promise<boolean> {
    try {
      localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(settings));
      
      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const result = await supabaseService.updateStoreSettings(settings);
          if (result) {
            return true;
          } else {
            return true;
          }
        } catch (error: any) {
          return true;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // ============ MENU ITEMS ============

  async getMenuItems(): Promise<MenuItem[]> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const supabaseItems = await supabaseService.getMenuItems();
        if (supabaseItems && supabaseItems.length > 0) {
          this.saveLocalMenuItems(supabaseItems);
          return supabaseItems;
        }
      } catch (error) {
        this.isMaintenanceMode = true;
        this.notifyMaintenanceListeners();
      }
    }

    const localItems = this.getLocalMenuItems();
    return localItems;
  }

  async getVisibleMenuItems(): Promise<MenuItem[]> {
    const items = await this.getMenuItems();
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
        } catch (error) {
          // Silently handle error
        }
      }

      const localItems = this.getLocalMenuItems();
      const existingIndex = localItems.findIndex(i => i.id === item.id);
      if (existingIndex !== -1) {
        localItems[existingIndex] = { ...localItems[existingIndex], ...item };
      } else {
        localItems.push(item);
      }
      this.saveLocalMenuItems(localItems);
      return item;
    } catch (error) {
      return null;
    }
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const result = await supabaseService.deleteMenuItem(id);
          if (result) {
            const localItems = this.getLocalMenuItems();
            const filtered = localItems.filter(item => item.id !== id);
            this.saveLocalMenuItems(filtered);
            return true;
          }
        } catch (error) {
          // Silently handle error
        }
      }

      const localItems = this.getLocalMenuItems();
      const filtered = localItems.filter(item => item.id !== id);
      if (filtered.length === localItems.length) {
        return false;
      }
      this.saveLocalMenuItems(filtered);
      return true;
    } catch (error) {
      return false;
    }
  }

  async updateMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem | null> {
    try {
      let updatedItem: MenuItem | null = null;

      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const result = await supabaseService.updateMenuItem(id, updates);
          if (result) {
            updatedItem = result;
          }
        } catch (error) {
          return null;
        }
      }

      const localItems = this.getLocalMenuItems();
      const index = localItems.findIndex(item => item.id === id);
      if (index !== -1) {
        localItems[index] = { ...localItems[index], ...updates };
        this.saveLocalMenuItems(localItems);
        
        if (!updatedItem) {
          updatedItem = localItems[index];
        }
      }

      return updatedItem;
    } catch (error) {
      return null;
    }
  }

  async toggleMenuItemStock(id: number): Promise<MenuItem | null> {
    try {
      const localItems = this.getLocalMenuItems();
      const index = localItems.findIndex(item => item.id === id);
      if (index === -1) return null;

      const toggled = { ...localItems[index], inStock: !localItems[index].inStock };
      
      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const result = await supabaseService.toggleMenuItemStock(id);
          if (result) {
            localItems[index] = result;
            this.saveLocalMenuItems(localItems);
            return result;
          }
        } catch (error) {
          return null;
        }
      }

      localItems[index] = toggled;
      this.saveLocalMenuItems(localItems);
      return toggled;
    } catch (error) {
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
        // Silently handle error
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

  async initializeMenuItems(defaultItems: MenuItem[]): Promise<void> {
    const localItems = this.getLocalMenuItems();
    
    if (localItems.length === 0) {
      this.saveLocalMenuItems(defaultItems);
    }

    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const supabaseItems = await supabaseService.getMenuItems();
        
        if (supabaseItems.length === 0) {
          for (const item of this.getLocalMenuItems()) {
            await supabaseService.addMenuItem(item);
          }
        } else if (localItems.length > 0) {
          const mergedItems = this.mergeMenuItems(localItems, supabaseItems);
          this.saveLocalMenuItems(mergedItems);
        }
      } catch (error) {
        // Silently handle error
      }
    }
  }

  private mergeMenuItems(local: MenuItem[], remote: MenuItem[]): MenuItem[] {
    const merged = [...remote];
    const remoteIds = new Set(remote.map(item => item.id));

    for (const item of local) {
      if (!remoteIds.has(item.id)) {
        merged.push(item);
      }
    }

    return merged;
  }

  // ============ USERS ============
  
  async getUsers(): Promise<User[]> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const supabaseUsers = await supabaseService.getUsers();
        if (supabaseUsers && supabaseUsers.length > 0) {
          this.saveLocalUsers(supabaseUsers);
          return supabaseUsers;
        }
      } catch (error) {
        // Silently handle error
      }
    }
    return this.getLocalUsers();
  }

  async getUserByPhone(phone: string): Promise<User | null> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const user = await supabaseService.getUserByPhone(phone);
        if (user) {
          const localUsers = this.getLocalUsers();
          const index = localUsers.findIndex(u => u.phone === phone);
          if (index !== -1) {
            localUsers[index] = user;
          } else {
            localUsers.push(user);
          }
          this.saveLocalUsers(localUsers);
          return user;
        }
      } catch (error) {
        // Silently handle error
      }
    }
    return this.getLocalUserByPhone(phone);
  }

  private getLocalUserByPhone(phone: string): User | null {
    const users = this.getLocalUsers();
    return users.find(u => u.phone === phone) || null;
  }

  async getUserById(id: string): Promise<User | null> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const user = await supabaseService.getUserById(id);
        if (user) {
          const localUsers = this.getLocalUsers();
          const index = localUsers.findIndex(u => u.id === id);
          if (index !== -1) {
            localUsers[index] = user;
          } else {
            localUsers.push(user);
          }
          this.saveLocalUsers(localUsers);
          return user;
        }
      } catch (error) {
        // Silently handle error
      }
    }
    const localUsers = this.getLocalUsers();
    return localUsers.find(u => u.id === id) || null;
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
          // Silently handle error
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
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      let updatedUser: User | null = null;

      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const user = await supabaseService.updateUser(id, updates);
          if (user) {
            updatedUser = user;
          }
        } catch (error) {
          // Silently handle error
        }
      }

      const localUsers = this.getLocalUsers();
      const index = localUsers.findIndex(u => u.id === id);
      if (index !== -1) {
        localUsers[index] = { ...localUsers[index], ...updates };
        this.saveLocalUsers(localUsers);
        if (!updatedUser) {
          updatedUser = localUsers[index];
        }
      }

      return updatedUser;
    } catch (error) {
      return null;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode) {
        try {
          const result = await supabaseService.deleteUser(id);
          if (result) {
            const localUsers = this.getLocalUsers();
            const filtered = localUsers.filter(u => u.id !== id);
            this.saveLocalUsers(filtered);
            return true;
          }
        } catch (error) {
          // Silently handle error
        }
      }

      const localUsers = this.getLocalUsers();
      const filtered = localUsers.filter(u => u.id !== id);
      if (filtered.length === localUsers.length) return false;
      this.saveLocalUsers(filtered);
      return true;
    } catch (error) {
      return false;
    }
  }

  async toggleUserStatus(id: string): Promise<User | null> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode) {
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
        } catch (error) {
          // Silently handle error
        }
      }

      const localUsers = this.getLocalUsers();
      const index = localUsers.findIndex(u => u.id === id);
      if (index === -1) return null;
      localUsers[index].isActive = !localUsers[index].isActive;
      this.saveLocalUsers(localUsers);
      return localUsers[index];
    } catch (error) {
      return null;
    }
  }

  async changeUserPassword(id: string, newPassword: string): Promise<boolean> {
    try {
      if (this.useSupabase && !this.isMaintenanceMode) {
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
        } catch (error) {
          // Silently handle error
        }
      }

      const localUsers = this.getLocalUsers();
      const index = localUsers.findIndex(u => u.id === id);
      if (index === -1) return false;
      localUsers[index].password = newPassword;
      this.saveLocalUsers(localUsers);
      return true;
    } catch (error) {
      return false;
    }
  }

  async initializeDefaultUsers(): Promise<void> {
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

    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const supabaseUsers = await supabaseService.getUsers();
        if (supabaseUsers.length === 0) {
          for (const user of this.getLocalUsers()) {
            await supabaseService.createUser({
              phone: user.phone,
              name: user.name,
              password: user.password,
              role: user.role,
              isActive: user.isActive,
            });
          }
        }
      } catch (error) {
        // Silently handle error
      }
    }
  }

  // ============ CART METHODS ============
  
  async getCartItems(userId: string): Promise<any[]> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        return await supabaseService.getCartItems(userId);
      } catch (error) {
        // Silently handle error
      }
    }
    return [];
  }

  async addToCart(userId: string, menuItemId: number, quantity: number, customizations?: any): Promise<void> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        await supabaseService.addToCart(userId, menuItemId, quantity, customizations);
        return;
      } catch (error) {
        // Silently handle error
      }
    }
  }

  async removeFromCart(userId: string, menuItemId: number): Promise<void> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        await supabaseService.removeFromCart(userId, menuItemId);
        return;
      } catch (error) {
        // Silently handle error
      }
    }
  }

  async updateCartItemQuantity(userId: string, menuItemId: number, quantity: number): Promise<void> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        await supabaseService.updateCartItemQuantity(userId, menuItemId, quantity);
        return;
      } catch (error) {
        // Silently handle error
      }
    }
  }

  async clearCart(userId: string): Promise<void> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        await supabaseService.clearCart(userId);
        return;
      } catch (error) {
        // Silently handle error
      }
    }
  }

  // ============ ORDER METHODS ============

  async createOrder(orderData: any): Promise<{ success: boolean; orderId?: string; error?: string }> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        return await supabaseService.createOrder(orderData);
      } catch (error) {
        return { 
          success: false, 
          error: 'Failed to create order. Please try again.' 
        };
      }
    }
    return { 
      success: false, 
      error: 'Order service unavailable. Please try again later.' 
    };
  }
}

export const db = DatabaseService.getInstance();