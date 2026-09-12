// config/tables.ts
import { config } from './env';

export const TABLES = {
  MENU: config.tables.menu,
  USERS: config.tables.users,
  STORE_SETTINGS: config.tables.storeSettings,
} as const;

export type TableName = keyof typeof TABLES;