// src/utils/storeLabels.ts
import { StoreCategory } from '../types';

export interface StoreLabelSet {
  menu: string;
  item: string;
  items: string;
  addAction: string;
  adminPanelTitle: string;
  searchPlaceholder: string;
}

const LABELS: Record<StoreCategory, StoreLabelSet> = {
  'food-beverage': {
    menu: 'Menu',
    item: 'Item',
    items: 'Items',
    addAction: 'Add',
    adminPanelTitle: 'Menu Items',
    searchPlaceholder: 'Search dishes, drinks, categories...',
  },
  'fashion-lifestyle': {
    menu: 'Catalog',
    item: 'Product',
    items: 'Products',
    addAction: 'Add',
    adminPanelTitle: 'Catalog Items',
    searchPlaceholder: 'Search clothing, jewelry, beauty...',
  },
  'home-living': {
    menu: 'Catalog',
    item: 'Product',
    items: 'Products',
    addAction: 'Add',
    adminPanelTitle: 'Catalog Items',
    searchPlaceholder: 'Search home, electronics, garden...',
  },
  'books-office': {
    menu: 'Catalog',
    item: 'Item',
    items: 'Items',
    addAction: 'Add',
    adminPanelTitle: 'Catalog Items',
    searchPlaceholder: 'Search books, stationery...',
  },
  'services-events': {
    menu: 'Services',
    item: 'Service',
    items: 'Services',
    addAction: 'Add',
    adminPanelTitle: 'Services',
    searchPlaceholder: 'Search services...',
  },
  'other-shops': {
    menu: 'Products',
    item: 'Product',
    items: 'Products',
    addAction: 'Add',
    adminPanelTitle: 'Products',
    searchPlaceholder: 'Search products...',
  },
};

export const getStoreLabels = (
  category: StoreCategory | undefined,
): StoreLabelSet => LABELS[category ?? 'food-beverage'] ?? LABELS['food-beverage'];