// services/database.service.ts
import { User, MenuItem } from '../types';
import { supabaseService } from './supabase.service';
import { isSupabaseConfigured } from '../config/env';
import { DEFAULT_ADMIN, SEED_USERS } from '../config/credentials';

class DatabaseService {
  private static instance: DatabaseService;
  private useSupabase: boolean;

  private constructor() {
    this.useSupabase = isSupabaseConfigured;
    console.log(`Database mode: ${this.useSupabase ? 'Supabase' : 'LocalStorage'}`);
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // ============ USERS ============
  
  async getUsers(): Promise<User[]> {
    if (this.useSupabase) {
      return supabaseService.getUsers();
    }
    return this.getLocalUsers();
  }

  async getUserByPhone(phone: string): Promise<User | null> {
    if (this.useSupabase) {
      return supabaseService.getUserByPhone(phone);
    }
    return this.getLocalUserByPhone(phone);
  }

  async getUserById(id: string): Promise<User | null> {
    if (this.useSupabase) {
      return supabaseService.getUserById(id);
    }
    return this.getLocalUserById(id);
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    if (this.useSupabase) {
      return supabaseService.createUser(userData);
    }
    return this.createLocalUser(userData);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    if (this.useSupabase) {
      return supabaseService.updateUser(id, updates);
    }
    return this.updateLocalUser(id, updates);
  }

  async deleteUser(id: string): Promise<boolean> {
    if (this.useSupabase) {
      return supabaseService.deleteUser(id);
    }
    return this.deleteLocalUser(id);
  }

  async toggleUserStatus(id: string): Promise<User | null> {
    if (this.useSupabase) {
      return supabaseService.toggleUserStatus(id);
    }
    return this.toggleLocalUserStatus(id);
  }

  async changeUserPassword(id: string, newPassword: string): Promise<boolean> {
    if (this.useSupabase) {
      return supabaseService.changeUserPassword(id, newPassword);
    }
    return this.changeLocalUserPassword(id, newPassword);
  }

  // ============ MENU ITEMS ============

  async getMenuItems(): Promise<MenuItem[]> {
    if (this.useSupabase) {
      return supabaseService.getMenuItems();
    }
    return this.getLocalMenuItems();
  }

  async getVisibleMenuItems(): Promise<MenuItem[]> {
    if (this.useSupabase) {
      return supabaseService.getVisibleMenuItems();
    }
    return this.getLocalVisibleMenuItems();
  }

  async updateMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem | null> {
    if (this.useSupabase) {
      return supabaseService.updateMenuItem(id, updates);
    }
    return this.updateLocalMenuItem(id, updates);
  }

  async toggleMenuItemStock(id: number): Promise<MenuItem | null> {
    if (this.useSupabase) {
      return supabaseService.toggleMenuItemStock(id);
    }
    return this.toggleLocalMenuItemStock(id);
  }

  async bulkUpdateMenuItems(updates: { id: number; inStock: boolean }[]): Promise<MenuItem[]> {
    if (this.useSupabase) {
      return supabaseService.bulkUpdateMenuItems(updates);
    }
    return this.bulkUpdateLocalMenuItems(updates);
  }

  async initializeMenuItems(defaultItems: MenuItem[]): Promise<void> {
    if (this.useSupabase) {
      return supabaseService.initializeMenuItems(defaultItems);
    }
    return this.initializeLocalMenuItems(defaultItems);
  }

  // ============ INITIALIZE DEFAULT ADMIN ============
  
  // services/database.service.ts - Update the initializeDefaultUsers method

async initializeDefaultUsers(): Promise<void> {
  if (this.useSupabase) {
    try {
      // Check if admin user already exists
      const existingAdmin = await supabaseService.getUserByPhone(DEFAULT_ADMIN.phone);
      
      if (!existingAdmin) {
        console.log('📝 Creating default admin in Supabase...');
        await supabaseService.createUser({
          phone: DEFAULT_ADMIN.phone,
          name: DEFAULT_ADMIN.name,
          password: DEFAULT_ADMIN.password,
          role: DEFAULT_ADMIN.role,
          isActive: DEFAULT_ADMIN.isActive,
        });
        console.log('✅ Default admin created in Supabase!');
        console.log(`📱 Phone: ${DEFAULT_ADMIN.phone}`);
        console.log(`🔑 Password: ${DEFAULT_ADMIN.password}`);
      } else {
        console.log(`✅ Admin user already exists with phone: ${DEFAULT_ADMIN.phone}`);
      }
      
      // Create seed users if they don't exist
      for (const seedUser of SEED_USERS) {
        const existingSeed = await supabaseService.getUserByPhone(seedUser.phone);
        if (!existingSeed) {
          await supabaseService.createUser({
            phone: seedUser.phone,
            name: seedUser.name,
            password: seedUser.password,
            role: seedUser.role,
            isActive: seedUser.isActive,
          });
          console.log(`✅ Seed user created: ${seedUser.phone}`);
        } else {
          console.log(`✅ Seed user already exists: ${seedUser.phone}`);
        }
      }
      
    } catch (error) {
      console.error('Error initializing default users:', error);
    }
  } else {
    this.initializeLocalDefaultUsers();
  }
}

  // ============ LOCAL STORAGE METHODS ============

  private getLocalData(): any {
    const data = localStorage.getItem('restaurant_db');
    return data ? JSON.parse(data) : { users: [], menu_items: [] };
  }

  private saveLocalData(table: string, data: any): void {
    const currentData = this.getLocalData();
    currentData[table] = data;
    localStorage.setItem('restaurant_db', JSON.stringify(currentData));
  }

  private initializeLocalDefaultUsers(): void {
    const users = this.getLocalUsers();
    if (users.length === 0) {
      // Create default admin from credentials
      const adminUser: User = {
        id: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        phone: DEFAULT_ADMIN.phone,
        name: DEFAULT_ADMIN.name,
        password: DEFAULT_ADMIN.password,
        role: DEFAULT_ADMIN.role,
        isActive: DEFAULT_ADMIN.isActive,
        createdAt: new Date().toISOString(),
      };
      
      const allUsers = [adminUser];
      
      // Add seed users if any
      for (const seedUser of SEED_USERS) {
        allUsers.push({
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          phone: seedUser.phone,
          name: seedUser.name,
          password: seedUser.password,
          role: seedUser.role,
          isActive: seedUser.isActive,
          createdAt: new Date().toISOString(),
        });
      }
      
      this.saveLocalData('users', allUsers);
      console.log(`✅ Default admin and ${SEED_USERS.length} seed users created in localStorage!`);
      console.log(`📱 Admin Phone: ${DEFAULT_ADMIN.phone}`);
      console.log(`🔑 Admin Password: ${DEFAULT_ADMIN.password}`);
    }
  }

  // Local User Methods
  private getLocalUsers(): User[] {
    const data = this.getLocalData();
    return data.users || [];
  }

  private getLocalUserByPhone(phone: string): User | null {
    const users = this.getLocalUsers();
    return users.find(u => u.phone === phone) || null;
  }

  private getLocalUserById(id: string): User | null {
    const users = this.getLocalUsers();
    return users.find(u => u.id === id) || null;
  }

  private createLocalUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    const users = this.getLocalUsers();
    const newUser: User = {
      ...userData,
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    this.saveLocalData('users', users);
    return newUser;
  }

  private updateLocalUser(id: string, updates: Partial<User>): User | null {
    const users = this.getLocalUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;
    users[index] = { ...users[index], ...updates };
    this.saveLocalData('users', users);
    return users[index];
  }

  private deleteLocalUser(id: string): boolean {
    const users = this.getLocalUsers();
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) return false;
    this.saveLocalData('users', filtered);
    return true;
  }

  private toggleLocalUserStatus(id: string): User | null {
    const users = this.getLocalUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;
    users[index].isActive = !users[index].isActive;
    this.saveLocalData('users', users);
    return users[index];
  }

  private changeLocalUserPassword(id: string, newPassword: string): boolean {
    const users = this.getLocalUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return false;
    users[index].password = newPassword;
    this.saveLocalData('users', users);
    return true;
  }

  // Local Menu Methods
  private getLocalMenuItems(): MenuItem[] {
    const data = this.getLocalData();
    return data.menu_items || [];
  }

  private getLocalVisibleMenuItems(): MenuItem[] {
    const items = this.getLocalMenuItems();
    return items.filter(item => item.inStock === true);
  }

  private updateLocalMenuItem(id: number, updates: Partial<MenuItem>): MenuItem | null {
    const items = this.getLocalMenuItems();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...updates };
    this.saveLocalData('menu_items', items);
    return items[index];
  }

  private toggleLocalMenuItemStock(id: number): MenuItem | null {
    const items = this.getLocalMenuItems();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    items[index].inStock = !items[index].inStock;
    this.saveLocalData('menu_items', items);
    return items[index];
  }

  private bulkUpdateLocalMenuItems(updates: { id: number; inStock: boolean }[]): MenuItem[] {
    const items = this.getLocalMenuItems();
    updates.forEach(update => {
      const index = items.findIndex(item => item.id === update.id);
      if (index !== -1) {
        items[index].inStock = update.inStock;
      }
    });
    this.saveLocalData('menu_items', items);
    return items;
  }

  private initializeLocalMenuItems(defaultItems: MenuItem[]): void {
    const existing = this.getLocalMenuItems();
    if (existing.length === 0) {
      this.saveLocalData('menu_items', defaultItems);
    }
  }
}

export const db = DatabaseService.getInstance();