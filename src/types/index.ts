// types/index.ts

export interface User {
  id: string;
  phone: string;
  name: string;
  password: string;
  role: 'admin' | 'user';
  isActive: boolean;
  tenantId?: string;
  createdAt: string;
  tenantSlug?: string;
  lastLogin?: string;
}

export interface StoreSettings {
  isOpen: boolean;
  closedMessage: string;
  expectedOpenDate: string;
  expectedOpenTime: string;
  lastUpdated: string;
}

// ✅ NEW — a single choice within a customization group
export interface CustomizationChoice {
  name: string;
  price: number;   // add-on price in Rs; 0 means no extra charge
}

// ✅ NEW — a customization group with its choices and optional default
export interface CustomizationOption {
  name: string;
  choices: CustomizationChoice[];
  default?: string;   // must match one of choices[].name
}

export interface MenuItem {
  id: number;
  sortOrder?: number;
  inStock: boolean;
  name: string;
  desc: string;
  costPrice?: number;
  price: number;
  img: string;
  category?: string;
  isVeg?: boolean;
  isSpicy?: boolean;
  isGlutenFree?: boolean;
  preparationTime?: string;
  calories?: number;
  rating?: number;
  reviewCount?: number;
  ingredients?: string[];
  nutritionalInfo?: {
    protein?: string;
    carbs?: string;
    fat?: string;
    fiber?: string;
  };
  attributes?: {
    isPopular?: boolean;
    isNew?: boolean;
    isChefSpecial?: boolean;
    isLimited?: boolean;
  };
  customizationOptions?: CustomizationOption[];   // ✅ updated shape
}

export interface CartItem extends MenuItem {
  quantity: number;
  customizations?: Record<string, string>;
  customMessage?: string;
  addonPrice?: number;
  basePrice?: number;
}

export interface ScheduleData {
  date: string;
  time: string;
}

export type PaymentMode = 'COD' | 'Online';
export type DeliveryType = 'now' | 'schedule';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}