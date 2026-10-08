// src/data/storeCategories.ts
import { StoreCategory } from '../types';

export interface StoreCategoryOption {
  value: StoreCategory;
  label: string;
  hint: string;
}

/**
 * The 15 top-level store categories shown in the signup "Store Type"
 * dropdown. Sub-hints are shown as secondary text in the select.
 */
export const STORE_CATEGORIES: StoreCategoryOption[] = [
  {
    value: 'restaurant',
    label: 'Sit-Down Restaurants',
    hint: 'Restaurants, Delis',
  },
  {
    value: 'drinks-cafe',
    label: 'Drinks & Cafés',
    hint: 'Coffee Shops, Tea Shops, Juice Bars',
  },
  {
    value: 'fast-food',
    label: 'Fast Food & Takeout',
    hint: 'Food Trucks, Pizza Shops',
  },
  {
    value: 'specialty-food',
    label: 'Specialty Food',
    hint: 'Sushi Bars',
  },
  {
    value: 'sweets-desserts',
    label: 'Sweets & Desserts',
    hint: 'Ice Cream Shops, Bakeries, Candy Stores',
  },
  {
    value: 'meat-seafood',
    label: 'Meat & Seafood',
    hint: 'Butcher Shops, Seafood Markets',
  },
  {
    value: 'events-flowers',
    label: 'Events & Flowers',
    hint: 'Catering Companies, Florist Shops',
  },
  {
    value: 'clothing-jewelry',
    label: 'Clothing & Jewelry',
    hint: 'Clothing Stores, Jewelry Stores',
  },
  {
    value: 'home-furniture',
    label: 'Home & Furniture',
    hint: 'Furniture Stores',
  },
  {
    value: 'electronics',
    label: 'Electronics',
    hint: 'Electronics Stores',
  },
  {
    value: 'books-office',
    label: 'Books & Office',
    hint: 'Bookstores, Office Supply Stores',
  },
  {
    value: 'health-beauty',
    label: 'Health & Beauty',
    hint: 'Cosmetics Stores, Pharmacies',
  },
  {
    value: 'sports-garden',
    label: 'Sports & Garden',
    hint: 'Sporting Goods Stores, Seed and Garden Stores',
  },
  {
    value: 'auto-parts',
    label: 'Auto Parts',
    hint: 'Auto Parts Stores',
  },
  {
    value: 'other-shops',
    label: 'Other Shops',
    hint: 'Pet Stores, Toy Stores, Hardware Stores, Liquor Stores',
  },
];

export const getCategoryLabel = (
  value: StoreCategory | undefined,
): string => {
  if (!value) return 'Store';
  const found = STORE_CATEGORIES.find((c) => c.value === value);
  return found?.label ?? 'Store';
};