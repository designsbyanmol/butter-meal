// services/menu.service.ts
import { MenuItem } from '../types';
import { db } from './database.service';

class MenuService {
  private menuItems: MenuItem[] = [];
  private listeners: ((items: MenuItem[]) => void)[] = [];
  private isInitialized: boolean = false;

  constructor() {
    this.loadMenuItems();
  }

  private async loadMenuItems(): Promise<void> {
    try {
      this.menuItems = await db.getMenuItems();
      this.isInitialized = true;
      this.notifyListeners();
      console.log(`📋 Menu service loaded ${this.menuItems.length} items`);
    } catch (error) {
      console.error('Error loading menu items:', error);
      this.menuItems = [];
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.menuItems]));
  }

  subscribe(listener: (items: MenuItem[]) => void): () => void {
    this.listeners.push(listener);
    // Send initial data
    if (this.isInitialized) {
      listener([...this.menuItems]);
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  async getVisibleItems(): Promise<MenuItem[]> {
    if (!this.isInitialized) {
      await this.loadMenuItems();
    }
    return this.menuItems.filter(item => item.inStock === true);
  }

  async getAllItems(): Promise<MenuItem[]> {
    if (!this.isInitialized) {
      await this.loadMenuItems();
    }
    return [...this.menuItems];
  }

  // ✅ Add new item
  async addItem(newItem: Omit<MenuItem, 'id'>): Promise<MenuItem | null> {
    try {
      // Generate new ID (find max id + 1)
      const maxId = this.menuItems.reduce((max, item) => Math.max(max, item.id), 0);
      const itemWithId: MenuItem = {
        ...newItem,
        id: maxId + 1,
      };
      
      const added = await db.addMenuItem(itemWithId);
      if (added) {
        // Update local cache
        const index = this.menuItems.findIndex(item => item.id === added.id);
        if (index !== -1) {
          this.menuItems[index] = added;
        } else {
          this.menuItems.push(added);
        }
        this.notifyListeners();
      }
      return added;
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  }

  // ✅ Delete item
  async deleteItem(itemId: number): Promise<boolean> {
    try {
      const deleted = await db.deleteMenuItem(itemId);
      if (deleted) {
        const index = this.menuItems.findIndex(item => item.id === itemId);
        if (index !== -1) {
          this.menuItems.splice(index, 1);
          this.notifyListeners();
        }
      }
      return deleted;
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  async toggleItemStock(itemId: number): Promise<MenuItem | null> {
    try {
      const updated = await db.toggleMenuItemStock(itemId);
      if (updated) {
        const index = this.menuItems.findIndex(item => item.id === itemId);
        if (index !== -1) {
          this.menuItems[index] = updated;
          this.notifyListeners();
        }
      }
      return updated;
    } catch (error) {
      console.error('Error toggling item stock:', error);
      throw error;
    }
  }

  // ✅ Update item method
  async updateItem(itemId: number, updates: Partial<MenuItem>): Promise<MenuItem | null> {
    try {
      const updated = await db.updateMenuItem(itemId, updates);
      if (updated) {
        const index = this.menuItems.findIndex(item => item.id === itemId);
        if (index !== -1) {
          this.menuItems[index] = updated;
          this.notifyListeners();
        }
      }
      return updated;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  async bulkUpdateStock(items: { id: number; inStock: boolean }[]): Promise<MenuItem[]> {
    try {
      const updated = await db.bulkUpdateMenuItems(items);
      updated.forEach(updatedItem => {
        const index = this.menuItems.findIndex(item => item.id === updatedItem.id);
        if (index !== -1) {
          this.menuItems[index] = updatedItem;
        }
      });
      this.notifyListeners();
      return updated;
    } catch (error) {
      console.error('Error bulk updating stock:', error);
      throw error;
    }
  }

  async initializeItems(defaultItems: MenuItem[]): Promise<void> {
    try {
      await db.initializeMenuItems(defaultItems);
      await this.loadMenuItems();
      console.log('✅ Menu items initialized successfully');
    } catch (error) {
      console.error('Error initializing menu items:', error);
      throw error;
    }
  }

  getItemById(id: number): MenuItem | undefined {
    return this.menuItems.find(item => item.id === id);
  }

  // Force refresh from database
  async refresh(): Promise<void> {
    await this.loadMenuItems();
  }
}

export const menuService = new MenuService();