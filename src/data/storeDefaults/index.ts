// src/data/storeDefaults/index.ts
import { StoreCategory } from '../../types';
import type { CategoryDefaults } from './types';

import { FOOD_BEVERAGE_DEFAULTS } from './foodBeverage';
import { FASHION_LIFESTYLE_DEFAULTS } from './fashionLifestyle';
import { HOME_LIVING_DEFAULTS } from './homeLiving';
import { BOOKS_OFFICE_DEFAULTS } from './booksOffice';
import { SERVICES_EVENTS_DEFAULTS } from './servicesEvents';
import { OTHER_SHOPS_DEFAULTS } from './otherShops';

export type { CategoryDefaults } from './types';

export const CATEGORY_DEFAULTS: Record<StoreCategory, CategoryDefaults> = {
  'food-beverage': FOOD_BEVERAGE_DEFAULTS,
  'fashion-lifestyle': FASHION_LIFESTYLE_DEFAULTS,
  'home-living': HOME_LIVING_DEFAULTS,
  'books-office': BOOKS_OFFICE_DEFAULTS,
  'services-events': SERVICES_EVENTS_DEFAULTS,
  'other-shops': OTHER_SHOPS_DEFAULTS,
};

export const getCategoryDefaults = (
  category: StoreCategory | undefined,
): CategoryDefaults =>
  CATEGORY_DEFAULTS[category ?? 'food-beverage'] ??
  CATEGORY_DEFAULTS['food-beverage'];