// src/data/storeDefaults/homeLiving.ts
import { it, u, type CategoryDefaults } from './types';

const HOME_LIVING_ITEMS = [
  it(1, '3-Seater Fabric Sofa', 24999, u('sofa.webp'), 'Linen upholstery, wooden legs', {
    costPrice: 28999,
    attributes: { isPopular: true },
    customizationOptions: [
      {
        name: 'Fabric',
        choices: [
          { name: 'Beige Linen', price: 0 },
          { name: 'Grey Cotton', price: 0 },
          { name: 'Navy Velvet', price: 2500 },
        ],
        default: 'Beige Linen',
      },
    ],
  }),
  it(2, 'Queen-Size Bed Frame', 18999, u('bed.webp'), 'Solid wood, platform style', {
    customizationOptions: [
      {
        name: 'Size',
        choices: [
          { name: 'Queen', price: 0 },
          { name: 'King', price: 3500 },
        ],
        default: 'Queen',
      },
    ],
  }),
  it(3, '6-Seater Dining Table', 19999, u('dinin.webp'), 'Solid oak, extends to 8-seater'),
  it(4, 'Wardrobe (3-door)', 21999, u('wardrobe.webp'), 'With mirror, internal drawers'),
  it(5, 'Study Desk', 6999, u('computer table.webp'), 'Wooden, with cable management'),
  it(6, 'Floor Lamp', 2999, u('lamp.webp'), 'Adjustable, fabric shade'),
  it(7, 'Wireless Earbuds', 2999, u('earbuds.webp'), 'BT 5.3, 24h battery, ANC', {
    costPrice: 3499,
    attributes: { isPopular: true },
    customizationOptions: [
      {
        name: 'Color',
        choices: [
          { name: 'White', price: 0 },
          { name: 'Black', price: 0 },
          { name: 'Blue', price: 0 },
        ],
        default: 'White',
      },
    ],
  }),
  it(8, 'Smart Watch', 8999, u('watch.webp'), 'AMOLED, GPS, heart-rate', {
    attributes: { isNew: true },
    customizationOptions: [
      {
        name: 'Strap',
        choices: [
          { name: 'Silicone Black', price: 0 },
          { name: 'Silicone Blue', price: 0 },
          { name: 'Leather Brown', price: 900 },
        ],
        default: 'Silicone Black',
      },
    ],
  }),
  it(9, 'Bluetooth Speaker', 2499, u('speaker.webp'), 'IPX7 waterproof, 12h playtime'),
  it(10, 'Power Bank 20000mAh', 1999, u('powerbank.webp'), 'Fast charge, dual USB'),
  it(11, 'Smart LED Bulb (Pack of 2)', 1199, u('show.webp'), '16M colors, app controlled'),
  it(12, 'Yoga Mat (6mm)', 1299, u('exercise.webp'), 'Non-slip, with carry strap', {
    customizationOptions: [
      {
        name: 'Color',
        choices: [
          { name: 'Purple', price: 0 },
          { name: 'Teal', price: 0 },
          { name: 'Charcoal', price: 0 },
        ],
        default: 'Purple',
      },
    ],
  }),
  it(13, 'Dumbbell Set (2 x 5kg)', 2499, u('dumbell.webp'), 'Rubber coated, chrome handles'),
  it(14, 'Garden Trowel Set', 499, u('picker.webp'), '3-piece, stainless steel'),
  it(15, 'Watering Can (5L)', 799, u('cubboard.webp'), 'Galvanized, long spout'),
  it(16, 'Pruning Shears', 599, u('hammer.webp'), 'Bypass, ergonomic grip'),
];

export const HOME_LIVING_DEFAULTS: CategoryDefaults = {
  bannerUrl:
    'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/assets/living-room.webp',
  items: HOME_LIVING_ITEMS,
};