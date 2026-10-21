// src/components/Menu/menuFilters.types.ts

/**
 * Menu type filters.
 *  - The four built-in badges keep their named keys.
 *  - `veg` / `nonVeg` are special-cased from the `isVeg` field.
 *  - Any custom badge key (e.g. `custom_badge_1_ab12`) is also valid.
 */
export type MenuType =
  | 'isPopular'
  | 'isNew'
  | 'isChefSpecial'
  | 'isLimited'
  | 'veg'
  | 'nonVeg'
  // Allow arbitrary custom badge keys while keeping autocomplete on the
  // named union above. (The `string & {}` trick is intentional.)
  | (string & {});

export type SortKey =
  | 'default'
  | 'priceAsc'
  | 'priceDesc'
  | 'ratingAsc'
  | 'ratingDesc'
  | 'healthiest'
  | 'discountDesc'
  | 'discountLeast';

export type StockFilter = 'all' | 'inStock' | 'outOfStock';

export interface MenuFilterState {
  search: string;
  category: string | null;
  types: Set<MenuType>;
  sort: SortKey;
  stock: StockFilter;
}

/**
 * Returns a fresh empty filter state.
 * Always use this instead of spreading EMPTY_FILTERS directly, because
 * `types` is a Set and spreading would share the same Set reference.
 */
export const createEmptyFilters = (): MenuFilterState => ({
  search: '',
  category: null,
  types: new Set(),
  sort: 'default',
  stock: 'all',
});

/**
 * @deprecated Prefer `createEmptyFilters()`.
 * Kept for backward compatibility. `types` is a shared Set reference -
 * do NOT spread and mutate it.
 */
export const EMPTY_FILTERS: MenuFilterState = createEmptyFilters();