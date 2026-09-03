// services/menu.service.ts
import { MenuItem } from '../types';
import { db } from './database.service';

class MenuService {
  private menuItems: MenuItem[] = [];
  private listeners: ((items: MenuItem[]) => void)[] = [];

  constructor() {
    this.loadMenuItems();
  }

  private async loadMenuItems(): Promise<void> {
    this.menuItems = await db.getMenuItems();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.menuItems]));
  }

  subscribe(listener: (items: MenuItem[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.menuItems]);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  async getVisibleItems(): Promise<MenuItem[]> {
    return this.menuItems.filter(item => item.inStock === true);
  }

  async getAllItems(): Promise<MenuItem[]> {
    return [...this.menuItems];
  }

  async toggleItemStock(itemId: number): Promise<MenuItem | null> {
    const updated = await db.toggleMenuItemStock(itemId);
    if (updated) {
      const index = this.menuItems.findIndex(item => item.id === itemId);
      if (index !== -1) {
        this.menuItems[index] = updated;
        this.notifyListeners();
      }
    }
    return updated;
  }

  // ✅ Update item method
  async updateItem(itemId: number, updates: Partial<MenuItem>): Promise<MenuItem | null> {
    const updated = await db.updateMenuItem(itemId, updates);
    if (updated) {
      const index = this.menuItems.findIndex(item => item.id === itemId);
      if (index !== -1) {
        this.menuItems[index] = updated;
        this.notifyListeners();
      }
    }
    return updated;
  }

  async bulkUpdateStock(items: { id: number; inStock: boolean }[]): Promise<MenuItem[]> {
    const updated = await db.bulkUpdateMenuItems(items);
    updated.forEach(updatedItem => {
      const index = this.menuItems.findIndex(item => item.id === updatedItem.id);
      if (index !== -1) {
        this.menuItems[index] = updatedItem;
      }
    });
    this.notifyListeners();
    return updated;
  }

  async initializeItems(defaultItems: MenuItem[]): Promise<void> {
    await db.initializeMenuItems(defaultItems);
    await this.loadMenuItems();
  }

  getItemById(id: number): MenuItem | undefined {
    return this.menuItems.find(item => item.id === id);
  }
}

export const menuService = new MenuService();