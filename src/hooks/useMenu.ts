// hooks/useMenu.ts
import { useState, useEffect } from 'react';
import { menuService } from '../services/menu.service';
import { MenuItem } from '../types';

export const useMenu = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [visibleItems, setVisibleItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Subscribe — will fire with fresh DB data once the initial fetch resolves
    const unsubscribe = menuService.subscribe((newItems) => {
      if (!mounted) return;
      setItems(newItems);
      setVisibleItems(newItems);
      setLoading(false);
    });

    // Belt-and-braces: fetch once on mount in case the subscription
    // missed the initial-fetch window (rare, but safe).
    menuService
      .getAllItems()
      .then((allItems) => {
        if (!mounted) return;
        setItems(allItems);
        setVisibleItems(allItems);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Write methods — delegate to menuService (which reloads after each write)
  const toggleStock = (itemId: number) => menuService.toggleItemStock(itemId);
  const updateItem = (itemId: number, updates: Partial<MenuItem>) =>
    menuService.updateItem(itemId, updates);
  const addItem = (newItem: Omit<MenuItem, 'id'>) =>
    menuService.addItem(newItem);
  const deleteItem = (itemId: number) => menuService.deleteItem(itemId);
  const bulkUpdateStock = (updates: { id: number; inStock: boolean }[]) =>
    menuService.bulkUpdateStock(updates);
  const reorderItems = (orderedIds: number[]) =>
    menuService.reorderItems(orderedIds);
  const getItemById = (id: number) => menuService.getItemById(id);

  return {
    items,
    visibleItems,
    loading,
    toggleStock,
    updateItem,
    addItem,
    deleteItem,
    bulkUpdateStock,
    reorderItems,
    getItemById,
  };
};