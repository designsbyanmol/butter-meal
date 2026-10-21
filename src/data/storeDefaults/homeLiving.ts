// src/data/storeDefaults/homeLiving.ts
import { it, u, type CategoryDefaults } from './types';

const HOME_LIVING_ITEMS = [
  it(1, '3-Seater Fabric Sofa', 24999, u('1555041469-a586c61ea9bc'), 'Linen upholstery, wooden legs', {
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
  it(2, 'Queen-Size Bed Frame', 18999, u('1505693416388-ac5ce068fe85'), 'Solid wood, platform style', {
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
  it(3, '6-Seater Dining Table', 19999, u('1617806118233-18e1de247200'), 'Solid oak, extends to 8-seater'),
  it(4, 'Wardrobe (3-door)', 21999, u('1595428774223-ef52624120d2'), 'With mirror, internal drawers'),
  it(5, 'Study Desk', 6999, u('1518455027359-f3f8164ba6bd'), 'Wooden, with cable management'),
  it(6, 'Floor Lamp', 2999, u('1507473885765-e6ed057f782c'), 'Adjustable, fabric shade'),
  it(7, 'Wireless Earbuds', 2999, u('1590658268037-6bf12165a8df'), 'BT 5.3, 24h battery, ANC', {
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
  it(8, 'Smart Watch', 8999, u('1523275335684-37898b6baf30'), 'AMOLED, GPS, heart-rate', {
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
  it(9, 'Bluetooth Speaker', 2499, u('1608043152269-423dbba4e7e1'), 'IPX7 waterproof, 12h playtime'),
  it(10, 'Power Bank 20000mAh', 1999, u('1609091839311-d5365f9ff1c5'), 'Fast charge, dual USB'),
  it(11, 'Smart LED Bulb (Pack of 2)', 1199, u('1550985616-10810253b84d'), '16M colors, app controlled'),
  it(12, 'Yoga Mat (6mm)', 1299, u('1591291621164-2c6367723315'), 'Non-slip, with carry strap', {
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
  it(13, 'Dumbbell Set (2 x 5kg)', 2499, u('1517836357463-d25dfeac3438'), 'Rubber coated, chrome handles'),
  it(14, 'Garden Trowel Set', 499, u('1416879595882-3373a0480b5b'), '3-piece, stainless steel'),
  it(15, 'Watering Can (5L)', 799, u('1416879595882-3373a0480b5b'), 'Galvanized, long spout'),
  it(16, 'Pruning Shears', 599, u('1416879595882-3373a0480b5b'), 'Bypass, ergonomic grip'),
];

export const HOME_LIVING_DEFAULTS: CategoryDefaults = {
  bannerUrl:
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&q=80&auto=format&fit=crop',
  items: HOME_LIVING_ITEMS,
};