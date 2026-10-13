// src/data/storeCategories.ts
import { StoreCategory } from '../types';

export interface StoreCategoryOption {
  value: StoreCategory;
  label: string;
  hint: string;
}

/**
 * The 7 top-level store categories shown in the signup "Store Type"
 * dropdown. Sub-hints are shown as secondary text in the select.
 */
export const STORE_CATEGORIES: StoreCategoryOption[] = [
  {
    value: 'food-beverage',
    label: 'Food & Beverage',
    hint: 'Restaurants, cafés, fast food, bakeries, sweets, meat & seafood',
  },
  {
    value: 'grocery-daily',
    label: 'Grocery & Daily Needs',
    hint: 'Kirana, supermarkets, fruits & vegetables, dairy, convenience',
  },
  {
    value: 'fashion-lifestyle',
    label: 'Fashion & Lifestyle',
    hint: 'Clothing, footwear, jewelry, cosmetics, salons, pharmacies',
  },
  {
    value: 'home-living',
    label: 'Home & Living',
    hint: 'Furniture, décor, electronics, appliances, sports, garden',
  },
  {
    value: 'books-office',
    label: 'Books & Office',
    hint: 'Stationery, books, office supplies, printing',
  },
  {
    value: 'services-events',
    label: 'Services & Events',
    hint: 'Florists, catering, events, auto parts & repair, general services',
  },
  {
    value: 'other-shops',
    label: 'Other Shops',
    hint: 'Pet stores, toy shops, hardware, liquor, anything else',
  },
];

export const getCategoryLabel = (
  value: StoreCategory | undefined,
): string => {
  if (!value) return 'Store';
  const found = STORE_CATEGORIES.find((c) => c.value === value);
  return found?.label ?? 'Store';
};

/** Ordered list of category values, useful for schema seeds and migrations. */
export const STORE_CATEGORY_VALUES: StoreCategory[] = STORE_CATEGORIES.map(
  (c) => c.value,
);

/** True when the given string is one of the 7 new category slugs. */
export const isStoreCategory = (v: unknown): v is StoreCategory =>
  typeof v === 'string' &&
  STORE_CATEGORY_VALUES.includes(v as StoreCategory);