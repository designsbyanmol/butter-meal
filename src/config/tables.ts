// src/config/tables.ts

export const TABLES = {
  MENU: import.meta.env.VITE_MENU_TABLE || 'star_veg_menu_items',
  USERS: import.meta.env.VITE_USERS_TABLE || 'star_veg_users',
  STORE_SETTINGS: import.meta.env.VITE_STORE_SETTINGS_TABLE || 'star_veg_store_settings',
} as const;

export type TableName = keyof typeof TABLES;