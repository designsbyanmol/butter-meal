// hooks/useMenu.ts
import { useState, useEffect } from 'react';
import { menuService } from '../services/menu.service';
import { useTenant } from '../contexts/TenantContext';
import { MenuItem } from '../types';

export const useMenu = () => {
  const { tenant } = useTenant();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [visibleItems, setVisibleItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No tenant → no menu (admin host fallback)
    if (!tenant) {
      setItems([]);
      setVisibleItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    menuService.setTenant(tenant.slug);

    let mounted = true;

    const unsubscribe = menuService.subscribe((newItems) => {
      if (!mounted) return;
      setItems(newItems);
      setVisibleItems(newItems);
      setLoading(false);
    });

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
  }, [tenant?.slug]);

  const toggleStock = (itemId: number) =>
    menuService.toggleItemStock(itemId);
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