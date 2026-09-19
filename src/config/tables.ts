// config/tables.ts
import { config } from './env';

export const TABLES = {
  MENU: config.tables.menu,
  USERS: config.tables.users,
  STORE_SETTINGS: config.tables.storeSettings,
  TENANTS: config.tables.tenants,
  PLANS: config.tables.plans,
  INVOICES: config.tables.invoices,
  PAUSE_REQUESTS: config.tables.pauseRequests,
} as const;

export type TableName = keyof typeof TABLES;