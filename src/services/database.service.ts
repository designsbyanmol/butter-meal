// services/database.service.ts
import { User, MenuItem } from '../types';
import { supabaseService } from './supabase.service';
import { isSupabaseConfigured } from '../config/env';
import { DEFAULT_ADMIN, SEED_USERS } from '../config/credentials';

class DatabaseService {
  private static instance: DatabaseService;
  private useSupabase: boolean;
  private isMaintenanceMode: boolean = true; // Start in maintenance mode
  private localStorageKey = 'restaurant_menu_data';
  private localStorageUsersKey = 'restaurant_users_data';
  private maintenanceListeners: ((isActive: boolean) => void)[] = [];
  private connectionChecked: boolean = false;
  private connectionCheckPromise: Promise<boolean> | null = null;

  private constructor() {
    this.useSupabase = isSupabaseConfigured;
    console.log(`Database mode: ${this.useSupabase ? 'Supabase + LocalStorage' : 'LocalStorage Only'}`);
    
    // Start with maintenance mode true until we verify connection
    if (this.useSupabase) {
      this.isMaintenanceMode = true;
      // Start checking connection immediately
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

  // Check connection on startup
  private async checkConnectionOnStartup(): Promise<boolean> {
    console.log('🔍 Checking Supabase connection on startup...');
    const isConnected = await this.testConnection();
    
    this.isMaintenanceMode = !isConnected;
    this.connectionChecked = true;
    console.log(`📊 Connection result: ${isConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
    this.notifyMaintenanceListeners();
    return isConnected;
  }

  // Test the actual connection to Supabase
  private async testConnection(): Promise<boolean> {
    if (!this.useSupabase) return false;
    
    try {
      console.log('🧪 Testing Supabase connection...');
      
      // Try to fetch menu items with a timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      const itemsPromise = supabaseService.getMenuItems();
      const items = await Promise.race([itemsPromise, timeoutPromise]) as MenuItem[];
      
      // Check if we got a valid response
      if (Array.isArray(items)) {
        console.log(`✅ Connection successful! Retrieved ${items.length} items`);
        return true;
      }
      
      console.log('❌ Connection failed: Invalid response');
      return false;
    } catch (error: any) {
      // Log the specific error
      if (error.message?.includes('timeout')) {
        console.error('❌ Connection timeout - Supabase is not responding');
      } else if (error.message?.includes('Invalid API key')) {
        console.error('❌ Invalid Supabase API key');
      } else if (error.message?.includes('404')) {
        console.error('❌ Supabase URL not found - Check your URL');
      } else {
        console.error('❌ Connection test failed:', error.message || error);
      }
      return false;
    }
  }

  // Subscribe to maintenance status changes
  subscribeToMaintenance(listener: (isActive: boolean) => void): () => void {
    this.maintenanceListeners.push(listener);
    // Immediately notify with current status
    listener(this.isMaintenanceMode);
    return () => {
      this.maintenanceListeners = this.maintenanceListeners.filter(l => l !== listener);
    };
  }

  private notifyMaintenanceListeners(): void {
    console.log(`📢 Notifying listeners: Maintenance mode = ${this.isMaintenanceMode}`);
    this.maintenanceListeners.forEach(listener => listener(this.isMaintenanceMode));
  }

  // Check if system is in maintenance mode
  public isInMaintenanceMode(): boolean {
    return this.isMaintenanceMode;
  }

  // Get maintenance status for UI
  public getMaintenanceStatus(): { isActive: boolean; message: string } {
    return {
      isActive: this.isMaintenanceMode,
      message: this.isMaintenanceMode 
        ? 'We are under some problem. Please connect after sometime.' 
        : ''
    };
  }

  // Force a connection check
  async forceConnectionCheck(): Promise<boolean> {
    if (!this.useSupabase) return false;
    
    console.log('🔄 Forcing connection check...');
    const isConnected = await this.testConnection();
    this.isMaintenanceMode = !isConnected;
    console.log(`📊 Force check result: ${isConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
    this.notifyMaintenanceListeners();
    return isConnected;
  }

  // Wait for initial connection check to complete
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
      console.error('Error reading local menu items:', error);
      return [];
    }
  }

  private saveLocalMenuItems(items: MenuItem[]): void {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving local menu items:', error);
    }
  }

  private getLocalUsers(): User[] {
    try {
      const data = localStorage.getItem(this.localStorageUsersKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading local users:', error);
      return [];
    }
  }

  private saveLocalUsers(users: User[]): void {
    try {
      localStorage.setItem(this.localStorageUsersKey, JSON.stringify(users));
    } catch (error) {
      console.error('Error saving local users:', error);
    }
  }

  // ============ MENU ITEMS ============

  async getMenuItems(): Promise<MenuItem[]> {
    // Always try to get from Supabase first if available
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const supabaseItems = await supabaseService.getMenuItems();
        if (supabaseItems && supabaseItems.length > 0) {
          // Update local storage with Supabase data
          this.saveLocalMenuItems(supabaseItems);
          console.log('✅ Menu items loaded from Supabase and cached locally');
          return supabaseItems;
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch from Supabase, falling back to local storage:', error);
        this.isMaintenanceMode = true;
        this.notifyMaintenanceListeners();
      }
    }

    // Fallback to local storage
    const localItems = this.getLocalMenuItems();
    console.log(`📦 Using local storage: ${localItems.length} items`);
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
            console.log('✅ Item added to Supabase and cached locally');
            return result;
          }
        } catch (error) {
          console.warn('⚠️ Failed to add to Supabase, saving locally only:', error);
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
      console.log('💾 Item saved to local storage only');
      return item;
    } catch (error) {
      console.error('Error adding menu item:', error);
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
            console.log('✅ Item deleted from Supabase and local cache');
            return true;
          }
        } catch (error) {
          console.warn('⚠️ Failed to delete from Supabase, deleting locally only:', error);
        }
      }

      const localItems = this.getLocalMenuItems();
      const filtered = localItems.filter(item => item.id !== id);
      if (filtered.length === localItems.length) {
        return false;
      }
      this.saveLocalMenuItems(filtered);
      console.log('💾 Item deleted from local storage only');
      return true;
    } catch (error) {
      console.error('Error deleting menu item:', error);
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
            console.log('✅ Item updated in Supabase');
          }
        } catch (error) {
          console.warn('⚠️ Failed to update in Supabase:', error);
        }
      }

      const localItems = this.getLocalMenuItems();
      const index = localItems.findIndex(item => item.id === id);
      if (index !== -1) {
        localItems[index] = { ...localItems[index], ...updates };
        this.saveLocalMenuItems(localItems);
        console.log('💾 Item updated in local storage');
        
        if (!updatedItem) {
          updatedItem = localItems[index];
        }
      }

      return updatedItem;
    } catch (error) {
      console.error('Error updating menu item:', error);
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
            console.log('✅ Stock toggled in Supabase and local cache');
            return result;
          }
        } catch (error) {
          console.warn('⚠️ Failed to toggle in Supabase, updating locally only:', error);
        }
      }

      localItems[index] = toggled;
      this.saveLocalMenuItems(localItems);
      console.log('💾 Stock toggled in local storage only');
      return toggled;
    } catch (error) {
      console.error('Error toggling menu item stock:', error);
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
          console.log('✅ Bulk update completed in Supabase');
          return updatedItems;
        }
      } catch (error) {
        console.warn('⚠️ Failed to bulk update in Supabase:', error);
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
    console.log('💾 Bulk update completed in local storage only');
    return updatedItems;
  }

  async initializeMenuItems(defaultItems: MenuItem[]): Promise<void> {
    const localItems = this.getLocalMenuItems();
    
    if (localItems.length === 0) {
      this.saveLocalMenuItems(defaultItems);
      console.log('📦 Default menu items initialized in local storage');
    }

    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        const supabaseItems = await supabaseService.getMenuItems();
        
        if (supabaseItems.length === 0) {
          console.log('📤 Syncing local items to Supabase...');
          for (const item of this.getLocalMenuItems()) {
            await supabaseService.addMenuItem(item);
          }
          console.log('✅ Local items synced to Supabase');
        } else if (localItems.length > 0) {
          console.log('🔄 Merging local and Supabase data...');
          const mergedItems = this.mergeMenuItems(localItems, supabaseItems);
          this.saveLocalMenuItems(mergedItems);
          console.log('✅ Data merged successfully');
        }
      } catch (error) {
        console.warn('⚠️ Failed to sync with Supabase, using local data only:', error);
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
        console.warn('⚠️ Failed to fetch users from Supabase:', error);
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
        console.warn('⚠️ Failed to fetch user from Supabase:', error);
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
        console.warn('⚠️ Failed to fetch user from Supabase:', error);
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
          console.warn('⚠️ Failed to create user in Supabase:', error);
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
      console.error('Error creating user:', error);
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
          console.warn('⚠️ Failed to update user in Supabase:', error);
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
      console.error('Error updating user:', error);
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
          console.warn('⚠️ Failed to delete user from Supabase:', error);
        }
      }

      const localUsers = this.getLocalUsers();
      const filtered = localUsers.filter(u => u.id !== id);
      if (filtered.length === localUsers.length) return false;
      this.saveLocalUsers(filtered);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
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
          console.warn('⚠️ Failed to toggle user status in Supabase:', error);
        }
      }

      const localUsers = this.getLocalUsers();
      const index = localUsers.findIndex(u => u.id === id);
      if (index === -1) return null;
      localUsers[index].isActive = !localUsers[index].isActive;
      this.saveLocalUsers(localUsers);
      return localUsers[index];
    } catch (error) {
      console.error('Error toggling user status:', error);
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
          console.warn('⚠️ Failed to change password in Supabase:', error);
        }
      }

      const localUsers = this.getLocalUsers();
      const index = localUsers.findIndex(u => u.id === id);
      if (index === -1) return false;
      localUsers[index].password = newPassword;
      this.saveLocalUsers(localUsers);
      return true;
    } catch (error) {
      console.error('Error changing password:', error);
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
      console.log('✅ Default users created in local storage');
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
          console.log('✅ Users synced to Supabase');
        }
      } catch (error) {
        console.warn('⚠️ Failed to sync users to Supabase:', error);
      }
    }
  }

  // ============ CART METHODS ============
  
  async getCartItems(userId: string): Promise<any[]> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        return await supabaseService.getCartItems(userId);
      } catch (error) {
        console.warn('⚠️ Failed to fetch cart from Supabase:', error);
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
        console.warn('⚠️ Failed to add to cart in Supabase:', error);
      }
    }
    console.log('💾 Cart operation saved locally only (no sync)');
  }

  async removeFromCart(userId: string, menuItemId: number): Promise<void> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        await supabaseService.removeFromCart(userId, menuItemId);
        return;
      } catch (error) {
        console.warn('⚠️ Failed to remove from cart in Supabase:', error);
      }
    }
    console.log('💾 Cart operation saved locally only (no sync)');
  }

  async updateCartItemQuantity(userId: string, menuItemId: number, quantity: number): Promise<void> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        await supabaseService.updateCartItemQuantity(userId, menuItemId, quantity);
        return;
      } catch (error) {
        console.warn('⚠️ Failed to update cart in Supabase:', error);
      }
    }
    console.log('💾 Cart operation saved locally only (no sync)');
  }

  async clearCart(userId: string): Promise<void> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        await supabaseService.clearCart(userId);
        return;
      } catch (error) {
        console.warn('⚠️ Failed to clear cart in Supabase:', error);
      }
    }
    console.log('💾 Cart operation saved locally only (no sync)');
  }

  // ============ ORDER METHODS ============

  async createOrder(orderData: any): Promise<{ success: boolean; orderId?: string; error?: string }> {
    if (this.useSupabase && !this.isMaintenanceMode) {
      try {
        return await supabaseService.createOrder(orderData);
      } catch (error) {
        console.warn('⚠️ Failed to create order in Supabase:', error);
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