// src/config/tables.ts

export const TABLES = {
  MENU: import.meta.env.VITE_MENU_TABLE || 'menu_items',
  USERS: import.meta.env.VITE_USERS_TABLE || 'users',
  CART: import.meta.env.VITE_CART_TABLE || 'cart_items',
  ORDERS: import.meta.env.VITE_ORDERS_TABLE || 'orders',
  STORE_SETTINGS: import.meta.env.VITE_STORE_SETTINGS_TABLE || 'store_settings',
} as const;

export type TableName = keyof typeof TABLES;