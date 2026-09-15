// components/Menu/menuFilters.types.ts
export type MenuType =
  | 'popular'
  | 'new'
  | 'chefSpecial'
  | 'limited'
  | 'veg'
  | 'nonVeg';

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
  category: string | null;      // null = all
  types: Set<MenuType>;
  sort: SortKey;
  stock: StockFilter;
}

export const EMPTY_FILTERS: MenuFilterState = {
  search: '',
  category: null,
  types: new Set(),
  sort: 'default',
  stock: 'all',
};