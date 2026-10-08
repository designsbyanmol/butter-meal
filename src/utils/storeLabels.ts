// src/utils/storeLabels.ts
import { StoreCategory } from '../types';

export interface StoreLabelSet {
  /** Top-level noun for the collection of things being sold. */
  menu: string;
  /** Singular noun for one thing. */
  item: string;
  /** Plural noun for many things. */
  items: string;
  /** Verb used on the primary action button. */
  addAction: string;
  /** Label for the admin panel heading ("Manage Menu" etc.). */
  adminPanelTitle: string;
  /** Placeholder for search fields ("Search dishes..." etc.). */
  searchPlaceholder: string;
}

const LABELS: Record<StoreCategory, StoreLabelSet> = {
  'restaurant': {
    menu: 'Menu',
    item: 'Dish',
    items: 'Dishes',
    addAction: 'Add',
    adminPanelTitle: 'Menu Items',
    searchPlaceholder: 'Search dishes, categories...',
  },
  'drinks-cafe': {
    menu: 'Menu',
    item: 'Drink',
    items: 'Drinks',
    addAction: 'Add',
    adminPanelTitle: 'Drinks Menu',
    searchPlaceholder: 'Search drinks...',
  },
  'fast-food': {
    menu: 'Menu',
    item: 'Item',
    items: 'Items',
    addAction: 'Add',
    adminPanelTitle: 'Menu Items',
    searchPlaceholder: 'Search items...',
  },
  'specialty-food': {
    menu: 'Menu',
    item: 'Item',
    items: 'Items',
    addAction: 'Add',
    adminPanelTitle: 'Menu Items',
    searchPlaceholder: 'Search items...',
  },
  'sweets-desserts': {
    menu: 'Menu',
    item: 'Treat',
    items: 'Treats',
    addAction: 'Add',
    adminPanelTitle: 'Treats Menu',
    searchPlaceholder: 'Search treats...',
  },
  'meat-seafood': {
    menu: 'Products',
    item: 'Product',
    items: 'Products',
    addAction: 'Add',
    adminPanelTitle: 'Products',
    searchPlaceholder: 'Search products...',
  },
  'events-flowers': {
    menu: 'Catalog',
    item: 'Item',
    items: 'Items',
    addAction: 'Add',
    adminPanelTitle: 'Catalog Items',
    searchPlaceholder: 'Search catalog...',
  },
  'clothing-jewelry': {
    menu: 'Catalog',
    item: 'Product',
    items: 'Products',
    addAction: 'Add',
    adminPanelTitle: 'Products',
    searchPlaceholder: 'Search products...',
  },
  'home-furniture': {
    menu: 'Catalog',
    item: 'Product',
    items: 'Products',
    addAction: 'Add',
    adminPanelTitle: 'Products',
    searchPlaceholder: 'Search products...',
  },
  'electronics': {
    menu: 'Products',
    item: 'Product',
    items: 'Products',
    addAction: 'Add',
    adminPanelTitle: 'Products',
    searchPlaceholder: 'Search products...',
  },
  'books-office': {
    menu: 'Catalog',
    item: 'Item',
    items: 'Items',
    addAction: 'Add',
    adminPanelTitle: 'Catalog Items',
    searchPlaceholder: 'Search catalog...',
  },
  'health-beauty': {
    menu: 'Products',
    item: 'Product',
    items: 'Products',
    addAction: 'Add',
    adminPanelTitle: 'Products',
    searchPlaceholder: 'Search products...',
  },
  'sports-garden': {
    menu: 'Products',
    item: 'Product',
    items: 'Products',
    addAction: 'Add',
    adminPanelTitle: 'Products',
    searchPlaceholder: 'Search products...',
  },
  'auto-parts': {
    menu: 'Parts',
    item: 'Part',
    items: 'Parts',
    addAction: 'Add',
    adminPanelTitle: 'Auto Parts',
    searchPlaceholder: 'Search parts...',
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
): StoreLabelSet => LABELS[category ?? 'restaurant'] ?? LABELS.restaurant;