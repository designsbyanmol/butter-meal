// src/data/storeDefaults/fashionLifestyle.ts
import { it, u, type CategoryDefaults } from './types';

const FASHION_LIFESTYLE_ITEMS = [
  it(1, 'Cotton Crew T-Shirt', 799, u('white-tshirt.webp'), 'Unisex, multiple colors', {
    attributes: { isPopular: true },
    customizationOptions: [
      {
        name: 'Size',
        choices: [
          { name: 'XS', price: 0 },
          { name: 'S', price: 0 },
          { name: 'M', price: 0 },
          { name: 'L', price: 0 },
          { name: 'XL', price: 0 },
          { name: 'XXL', price: 0 },
        ],
        default: 'M',
      },
      {
        name: 'Color',
        choices: [
          { name: 'Black', price: 0 },
          { name: 'White', price: 0 },
          { name: 'Navy', price: 0 },
          { name: 'Olive', price: 0 },
        ],
        default: 'Black',
      },
    ],
  }),
  it(2, 'Slim-Fit Denim Jeans', 1899, u('jeans.webp'), 'Stretch denim, mid-rise', {
    customizationOptions: [
      {
        name: 'Size',
        choices: [
          { name: '28', price: 0 },
          { name: '30', price: 0 },
          { name: '32', price: 0 },
          { name: '34', price: 0 },
          { name: '36', price: 0 },
        ],
        default: '32',
      },
      {
        name: 'Wash',
        choices: [
          { name: 'Dark Indigo', price: 0 },
          { name: 'Light Blue', price: 0 },
          { name: 'Black', price: 0 },
        ],
        default: 'Dark Indigo',
      },
    ],
  }),
  it(3, 'Floral Summer Dress', 2199, u('red-frock.webp'), 'Midi length, breathable', {
    attributes: { isNew: true },
    customizationOptions: [
      {
        name: 'Size',
        choices: [
          { name: 'XS', price: 0 },
          { name: 'S', price: 0 },
          { name: 'M', price: 0 },
          { name: 'L', price: 0 },
        ],
        default: 'M',
      },
    ],
  }),
  it(4, 'Kurta Set (Men)', 2499, u('wrap.webp'), 'Cotton blend, festive', {
    customizationOptions: [
      {
        name: 'Size',
        choices: [
          { name: 'S', price: 0 },
          { name: 'M', price: 0 },
          { name: 'L', price: 0 },
          { name: 'XL', price: 0 },
        ],
        default: 'M',
      },
      {
        name: 'Color',
        choices: [
          { name: 'Beige', price: 0 },
          { name: 'Maroon', price: 0 },
          { name: 'Navy', price: 0 },
        ],
        default: 'Beige',
      },
    ],
  }),
  it(5, 'Saree (Silk Blend)', 3499, u('saree.webp'), 'Traditional, with blouse piece', {
    attributes: { isChefSpecial: true },
  }),
  it(6, 'Running Sneakers', 3299, u('nike-shoe.webp'), 'Cushioned, breathable mesh', {
    customizationOptions: [
      {
        name: 'Size',
        choices: [
          { name: 'UK 6', price: 0 },
          { name: 'UK 7', price: 0 },
          { name: 'UK 8', price: 0 },
          { name: 'UK 9', price: 0 },
          { name: 'UK 10', price: 0 },
        ],
        default: 'UK 8',
      },
    ],
  }),
  it(7, 'Leather Wallet', 899, u('waller.webp'), 'Bifold, RFID-blocking'),
  it(8, 'Silver Chain Necklace', 2499, u('necklace.webp'), '925 sterling silver, 20"', {
    attributes: { isPopular: true },
  }),
  it(9, 'Gold-Plated Earrings', 1899, u('ear-rings.webp'), 'Pair, anti-tarnish finish'),
  it(10, 'Designer Sunglasses', 2499, u('sunglasses.webp'), 'UV400, unisex frame'),
  it(11, 'Vitamin C Serum', 999, u('serum.webp'), '20% concentration, 30ml', {
    customizationOptions: [
      {
        name: 'Quantity',
        choices: [
          { name: '30 ml', price: 0 },
          { name: '50 ml', price: 400 },
        ],
        default: '30 ml',
      },
    ],
  }),
  it(12, 'Moisturizer SPF 30', 799, u('moisture-cream.webp'), 'Daily use, 50ml'),
  it(13, 'Perfume (Eau de Parfum)', 2499, u('perfume.webp'), '50ml, long-lasting', {
    customizationOptions: [
      {
        name: 'Size',
        choices: [
          { name: '50 ml', price: 0 },
          { name: '100 ml', price: 900 },
        ],
        default: '50 ml',
      },
      {
        name: 'Fragrance',
        choices: [
          { name: 'Woody', price: 0 },
          { name: 'Floral', price: 0 },
          { name: 'Citrus', price: 0 },
        ],
        default: 'Woody',
      },
    ],
  }),
  it(14, 'Lipstick', 799, u('lipstick.webp'), 'Matte finish, assorted shades', {
    customizationOptions: [
      {
        name: 'Shade',
        choices: [
          { name: 'Ruby Red', price: 0 },
          { name: 'Nude Pink', price: 0 },
          { name: 'Berry', price: 0 },
          { name: 'Brown', price: 0 },
        ],
        default: 'Nude Pink',
      },
    ],
  }),
  it(15, 'Hair Shampoo', 499, u('hair.webp'), 'Sulfate-free, 300ml'),
  it(16, 'Multivitamin (60 tabs)', 699, u('tablets.webp'), 'Daily, men & women'),
];

export const FASHION_LIFESTYLE_DEFAULTS: CategoryDefaults = {
  bannerUrl:
    'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/assets/red-frock.webp',
  items: FASHION_LIFESTYLE_ITEMS,
};