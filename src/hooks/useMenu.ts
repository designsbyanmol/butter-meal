// hooks/useMenu.ts
import { useState, useEffect } from 'react';
import { menuService } from '../services/menu.service';
import { MenuItem } from '../types';

export const useMenu = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [visibleItems, setVisibleItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = menuService.subscribe((newItems) => {
      setItems(newItems);
      // ✅ Show ALL items, including out-of-stock
      setVisibleItems(newItems); // Changed from filtering to show all
      setLoading(false);
    });

    menuService.getAllItems().then(allItems => {
      setItems(allItems);
      // ✅ Show ALL items, including out-of-stock
      setVisibleItems(allItems); // Changed from filtering to show all
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const toggleStock = async (itemId: number) => {
    return await menuService.toggleItemStock(itemId);
  };

  const updateItem = async (itemId: number, updates: Partial<MenuItem>) => {
    return await menuService.updateItem(itemId, updates);
  };

  const addItem = async (newItem: Omit<MenuItem, 'id'>) => {
    try {
      const addedItem = await menuService.addItem(newItem);
      const allItems = await menuService.getAllItems();
      setItems(allItems);
      // ✅ Show ALL items
      setVisibleItems(allItems);
      return addedItem;
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  };

  const deleteItem = async (itemId: number) => {
    try {
      await menuService.deleteItem(itemId);
      const allItems = await menuService.getAllItems();
      setItems(allItems);
      // ✅ Show ALL items
      setVisibleItems(allItems);
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  };

  const bulkUpdateStock = async (items: { id: number; inStock: boolean }[]) => {
    return await menuService.bulkUpdateStock(items);
  };

  const getItemById = (id: number) => {
    return menuService.getItemById(id);
  };

  return {
    items,
    visibleItems,
    loading,
    toggleStock,
    updateItem,
    addItem,
    deleteItem,
    bulkUpdateStock,
    getItemById,
  };
};