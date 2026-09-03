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
      setVisibleItems(newItems.filter(item => item.inStock === true));
      setLoading(false);
    });

    menuService.getAllItems().then(allItems => {
      setItems(allItems);
      setVisibleItems(allItems.filter(item => item.inStock === true));
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const toggleStock = async (itemId: number) => {
    return await menuService.toggleItemStock(itemId);
  };

  // ✅ Update item function
  const updateItem = async (itemId: number, updates: Partial<MenuItem>) => {
    return await menuService.updateItem(itemId, updates);
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
    updateItem, // ✅ Expose updateItem
    bulkUpdateStock,
    getItemById,
  };
};