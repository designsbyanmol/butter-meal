// src/data/storeDefaults/servicesEvents.ts
import { it, u, type CategoryDefaults } from './types';

const SERVICES_EVENTS_ITEMS = [
  it(1, 'Red Rose Bouquet (12)', 599, u('1518895949257-7621c3c786d7'), 'Fresh long-stem red roses', {
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
  it(2, 'Mixed Seasonal Bouquet', 799, u('1490750967868-88aa4486c946'), 'Assorted fresh flowers', {
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
  it(3, 'White Lily Bouquet', 649, u('1519744792095-2f2205e87b6f'), 'Fragrant Oriental lilies'),
  it(4, 'Wedding Centerpiece', 1499, u('1519225421980-715cb0215aed'), 'Custom floral arrangement', {
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
  it(5, 'Sympathy Wreath', 1299, u('1519225421980-715cb0215aed'), 'White and green standing wreath'),
  it(6, 'Balloon Bouquet (12)', 499, u('1530103862676-de8c9debad1d'), 'Helium-filled assorted colors', {
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
  it(7, 'Catering - Veg (per person)', 449, u('1555244162-803834f70033'), 'Assorted veg mains, sides, dessert', {
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
  it(8, 'Catering - Non-Veg (per person)', 599, u('1555939594-58d7cb561ad1'), 'Chicken, mutton, sides, dessert', {
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
  it(9, 'Chafing Dish Rental', 349, u('1556910103-1c02745aae4d'), 'Per dish, includes fuel'),
  it(10, 'Event Photography (1 hr)', 2999, u('1519741497674-611481863552'), 'Digital album, 50+ edited photos', {
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
  it(11, 'Fairy Lights (10m)', 299, u('1519225421980-715cb0215aed'), 'Warm white LED string'),
  it(12, 'Table Centerpiece Set', 799, u('1464366400600-7168b8af9bc3'), 'Set of 4, candles included'),
  it(13, 'Haircut & Blow Dry', 499, u('1560066984-138dadb4c035'), 'Wash, cut and style', {
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
  it(14, 'Hair Colour (Global)', 2499, u('1522337360788-8b13dee7a37e'), 'Ammonia-free, full head', {
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
  it(15, 'Facial - Hydrating', 1299, u('1570172619644-dfd03ed5d881'), '60 min, cleanser + mask + massage'),
  it(16, 'Manicure + Pedicure', 999, u('1604654894610-df63bc536371'), 'Combo, includes polish', {
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
  it(17, 'Full Body Massage', 2199, u('1600334089648-b0d9d3028eb2'), '60 min, aromatherapy', {
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
  it(18, 'Bridal Makeup Package', 8999, u('1487412720507-e7ab37603c6f'), 'Makeup + hair + draping', {
    attributes: { isLimited: true },
  }),
  it(19, 'Engine Oil 5W-30 (4L)', 2299, u('1632823393213-3c4e0a5b5a1a'), 'Fully synthetic, API SP'),
  it(20, 'Brake Pads (Front Pair)', 2499, u('1486263248352-3c4c2f5c6c1f'), 'Ceramic, low-dust'),
  it(21, 'Car Battery 12V 45Ah', 5999, u('1609091839311-d5365f9ff1c5'), 'Maintenance-free, 2-yr warranty'),
  it(22, 'Wiper Blades (Pair)', 899, u('1486263248352-3c4c2f5c6c1f'), 'Beam style, all-weather'),
  it(23, 'Air Filter', 699, u('1632823393213-3c4e0a5b5a1a'), 'High-flow, washable'),
  it(24, 'Spark Plug Set (4)', 1299, u('1632823393213-3c4e0a5b5a1a'), 'Iridium tip, long-life'),
];

export const SERVICES_EVENTS_DEFAULTS: CategoryDefaults = {
  bannerUrl:
    'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1600&q=80&auto=format&fit=crop',
  items: SERVICES_EVENTS_ITEMS,
};