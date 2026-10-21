// src/data/storeDefaults/fashionLifestyle.ts
import { it, u, type CategoryDefaults } from './types';

const FASHION_LIFESTYLE_ITEMS = [
  it(1, 'Cotton Crew T-Shirt', 799, u('1521572163474-6864f9cf17ab'), 'Unisex, multiple colors', {
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
  it(2, 'Slim-Fit Denim Jeans', 1899, u('1542272604-787c3835535d'), 'Stretch denim, mid-rise', {
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
  it(3, 'Floral Summer Dress', 2199, u('1595777457583-95e059d581b8'), 'Midi length, breathable', {
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
  it(4, 'Kurta Set (Men)', 2499, u('1610180318691-1e67dbfad3dd'), 'Cotton blend, festive', {
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
  it(5, 'Saree (Silk Blend)', 3499, u('1610030469983-98e550d6193c'), 'Traditional, with blouse piece', {
    attributes: { isChefSpecial: true },
  }),
  it(6, 'Running Sneakers', 3299, u('1542291026-7eec264c27ff'), 'Cushioned, breathable mesh', {
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
  it(7, 'Leather Wallet', 899, u('1627123424574-724758594e93'), 'Bifold, RFID-blocking'),
  it(8, 'Silver Chain Necklace', 2499, u('1599643478518-a784e5dc4c8f'), '925 sterling silver, 20"', {
    attributes: { isPopular: true },
  }),
  it(9, 'Gold-Plated Earrings', 1899, u('1535632066927-ab7c9ab60908'), 'Pair, anti-tarnish finish'),
  it(10, 'Designer Sunglasses', 2499, u('1572635196237-14b3f281503f'), 'UV400, unisex frame'),
  it(11, 'Vitamin C Serum', 999, u('1620916566398-39f1143ab7be'), '20% concentration, 30ml', {
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
  it(12, 'Moisturizer SPF 30', 799, u('1556228720-195a672e8a03'), 'Daily use, 50ml'),
  it(13, 'Perfume (Eau de Parfum)', 2499, u('1541643600914-78b084683601'), '50ml, long-lasting', {
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
  it(14, 'Lipstick', 799, u('1586495777744-4413f21062fa'), 'Matte finish, assorted shades', {
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
  it(15, 'Hair Shampoo', 499, u('1585232004423-244e0e6904e3'), 'Sulfate-free, 300ml'),
  it(16, 'Multivitamin (60 tabs)', 699, u('1587854692152-cbe660dbde88'), 'Daily, men & women'),
];

export const FASHION_LIFESTYLE_DEFAULTS: CategoryDefaults = {
  bannerUrl:
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1600&q=80&auto=format&fit=crop',
  items: FASHION_LIFESTYLE_ITEMS,
};