// types/index.ts
export interface User {
  id: string;
  phone: string; // Changed from email to phone
  name: string;
  password: string; // In production, use proper hashing
  role: 'admin' | 'user';
  isActive: boolean; // Admin can activate/deactivate users
  createdAt: string;
  lastLogin?: string;
}

export interface MenuItem {
  id: number;
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
  customizationOptions?: {
    name: string;
    options: string[];
    default?: string;
  }[];
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