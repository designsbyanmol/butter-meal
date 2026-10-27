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

/** Resolve a filename to the jsDelivr CDN URL. */
export const u = (filename: string): string =>
  `https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/assets/${filename}`;