// src/data/storeDefaults/types.ts
import { MenuItem } from '../../types';

export interface CategoryDefaults {
  bannerUrl: string;
  items: MenuItem[];
}

export type BuildOverrides = Partial<
  Omit<MenuItem, 'id' | 'name' | 'price' | 'img' | 'desc'>
>;

export const it = (
  id: number,
  name: string,
  price: number,
  img: string,
  desc: string,
  overrides: BuildOverrides = {},
): MenuItem => ({
  id,
  inStock: true,
  name,
  desc,
  price,
  img,
  isVeg: false,
  attributes: {},
  ...overrides,
});

export const u = (id: string): string =>
  `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;