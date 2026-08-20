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
  addonPrice?: number;
  basePrice?: number;
}

export interface ScheduleData {
  date: string;
  time: string;
}

export type PaymentMode = 'COD' | 'Online';
export type DeliveryType = 'now' | 'schedule';