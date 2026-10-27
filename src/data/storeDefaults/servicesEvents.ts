// src/data/storeDefaults/servicesEvents.ts
import { it, u, type CategoryDefaults } from './types';

const SERVICES_EVENTS_ITEMS = [
  it(1, 'Red Rose Bouquet (12)', 599, u('rose.webp'), 'Fresh long-stem red roses', {
    attributes: { isPopular: true },
    customizationOptions: [
      {
        name: 'Quantity',
        choices: [
          { name: '6 stems', price: 0 },
          { name: '12 stems', price: 300 },
          { name: '24 stems', price: 800 },
        ],
        default: '12 stems',
      },
      {
        name: 'Wrapping',
        choices: [
          { name: 'Classic Kraft', price: 0 },
          { name: 'Red Gift Wrap', price: 50 },
          { name: 'Premium Box', price: 150 },
        ],
        default: 'Classic Kraft',
      },
    ],
  }),
  it(2, 'Mixed Seasonal Bouquet', 799, u('mix-fruit.webp'), 'Assorted fresh flowers', {
    customizationOptions: [
      {
        name: 'Size',
        choices: [
          { name: 'Petite', price: 0 },
          { name: 'Standard', price: 400 },
          { name: 'Grand', price: 1200 },
        ],
        default: 'Standard',
      },
    ],
  }),
  it(3, 'White Lily Bouquet', 649, u('lilly.webp'), 'Fragrant Oriental lilies'),
  it(4, 'Wedding Centerpiece', 1499, u('table-flower.webp'), 'Custom floral arrangement', {
    customizationOptions: [
      {
        name: 'Palette',
        choices: [
          { name: 'All White', price: 0 },
          { name: 'Blush & Ivory', price: 0 },
          { name: 'Bold Red & Gold', price: 200 },
        ],
        default: 'Blush & Ivory',
      },
    ],
  }),
  it(5, 'Sympathy Wreath', 1299, u('table-flower.webp'), 'White and green standing wreath'),
  it(6, 'Balloon Bouquet (12)', 499, u('balooon.webp'), 'Helium-filled assorted colors', {
    customizationOptions: [
      {
        name: 'Theme',
        choices: [
          { name: 'Birthday', price: 0 },
          { name: 'Anniversary', price: 0 },
          { name: 'Baby Shower', price: 0 },
        ],
        default: 'Birthday',
      },
    ],
  }),
  it(7, 'Catering - Veg (per person)', 449, u('cooking.webp'), 'Assorted veg mains, sides, dessert', {
    isVeg: true,
    attributes: { isPopular: true },
    customizationOptions: [
      {
        name: 'Package',
        choices: [
          { name: 'Basic (3 items)', price: 0 },
          { name: 'Standard (5 items)', price: 200 },
          { name: 'Premium (7 items)', price: 500 },
        ],
        default: 'Standard (5 items)',
      },
    ],
  }),
  it(8, 'Catering - Non-Veg (per person)', 599, u('caters.webp'), 'Chicken, mutton, sides, dessert', {
    customizationOptions: [
      {
        name: 'Package',
        choices: [
          { name: 'Basic (3 items)', price: 0 },
          { name: 'Standard (5 items)', price: 250 },
          { name: 'Premium (7 items)', price: 600 },
        ],
        default: 'Standard (5 items)',
      },
    ],
  }),
  it(9, 'Chafing Dish Rental', 349, u('dumbell.webp'), 'Per dish, includes fuel'),
  it(10, 'Event Photography (1 hr)', 2999, u('meeting.webp'), 'Digital album, 50+ edited photos', {
    attributes: { isChefSpecial: true },
    customizationOptions: [
      {
        name: 'Duration',
        choices: [
          { name: '1 hour', price: 0 },
          { name: '3 hours', price: 4500 },
          { name: 'Full day (8 hrs)', price: 12000 },
        ],
        default: '1 hour',
      },
      {
        name: 'Deliverables',
        choices: [
          { name: 'Digital album', price: 0 },
          { name: 'Printed photo book', price: 1500 },
        ],
        default: 'Digital album',
      },
    ],
  }),
  it(11, 'Fairy Lights (10m)', 299, u('lamp.webp'), 'Warm white LED string'),
  it(12, 'Table Centerpiece Set', 799, u('table-flower.webp'), 'Set of 4, candles included'),
  it(13, 'Haircut & Blow Dry', 499, u('hair.webp'), 'Wash, cut and style', {
    attributes: { isPopular: true },
    customizationOptions: [
      {
        name: 'Hair Length',
        choices: [
          { name: 'Short', price: 0 },
          { name: 'Medium', price: 150 },
          { name: 'Long', price: 300 },
        ],
        default: 'Medium',
      },
    ],
  }),
  it(14, 'Hair Colour (Global)', 2499, u('saloon.webp'), 'Ammonia-free, full head', {
    customizationOptions: [
      {
        name: 'Shade',
        choices: [
          { name: 'Natural Brown', price: 0 },
          { name: 'Burgundy', price: 200 },
          { name: 'Blonde', price: 500 },
        ],
        default: 'Natural Brown',
      },
    ],
  }),
  it(15, 'Facial - Hydrating', 1299, u('facial.webp'), '60 min, cleanser + mask + massage'),
  it(16, 'Manicure + Pedicure', 999, u('nails.webp'), 'Combo, includes polish', {
    customizationOptions: [
      {
        name: 'Polish',
        choices: [
          { name: 'Classic', price: 0 },
          { name: 'Gel', price: 300 },
        ],
        default: 'Classic',
      },
    ],
  }),
  it(17, 'Full Body Massage', 2199, u('massage.webp'), '60 min, aromatherapy', {
    customizationOptions: [
      {
        name: 'Oil',
        choices: [
          { name: 'Lavender', price: 0 },
          { name: 'Eucalyptus', price: 0 },
          { name: 'Unscented', price: 0 },
        ],
        default: 'Lavender',
      },
    ],
  }),
  it(18, 'Bridal Makeup Package', 8999, u('facial.webp'), 'Makeup + hair + draping', {
    attributes: { isLimited: true },
  }),
  it(19, 'Engine Oil 5W-30 (4L)', 2299, u('cooking.webp'), 'Fully synthetic, API SP'),
  it(20, 'Brake Pads (Front Pair)', 2499, u('hammer.webp'), 'Ceramic, low-dust'),
  it(21, 'Car Battery 12V 45Ah', 5999, u('powerbank.webp'), 'Maintenance-free, 2-yr warranty'),
  it(22, 'Wiper Blades (Pair)', 899, u('hammer.webp'), 'Beam style, all-weather'),
  it(23, 'Air Filter', 699, u('cooking.webp'), 'High-flow, washable'),
  it(24, 'Spark Plug Set (4)', 1299, u('powerbank.webp'), 'Iridium tip, long-life'),
];

export const SERVICES_EVENTS_DEFAULTS: CategoryDefaults = {
  bannerUrl:
    'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/assets/rose.webp',
  items: SERVICES_EVENTS_ITEMS,
};