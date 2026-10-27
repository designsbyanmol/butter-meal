// src/data/storeDefaults/otherShops.ts
import { it, u, type CategoryDefaults } from './types';

const OTHER_SHOPS_ITEMS = [
  it(1, 'Fresh Tomatoes (1 kg)', 40, u('tomato.webp'), 'Farm-fresh, ripe red tomatoes', {
    isVeg: true,
    attributes: { isPopular: true },
    customizationOptions: [
      {
        name: 'Quantity',
        choices: [
          { name: '500 g', price: -18 },
          { name: '1 kg', price: 0 },
          { name: '2 kg', price: 35 },
        ],
        default: '1 kg',
      },
    ],
  }),
  it(2, 'Onions (1 kg)', 35, u('potato.webp'), 'Fresh yellow onions', {
    isVeg: true,
    customizationOptions: [
      {
        name: 'Quantity',
        choices: [
          { name: '500 g', price: -15 },
          { name: '1 kg', price: 0 },
          { name: '2 kg', price: 30 },
        ],
        default: '1 kg',
      },
    ],
  }),
  it(3, 'Potatoes (1 kg)', 30, u('potato.webp'), 'Washed, all-purpose', {
    isVeg: true,
  }),
  it(4, 'Bananas (Dozen)', 60, u('banana.webp'), 'Ripe Robusta bananas', {
    isVeg: true,
    attributes: { isPopular: true },
  }),
  it(5, 'Apples - Shimla (1 kg)', 180, u('apple.webp'), 'Crisp, sweet-tart', {
    isVeg: true,
    customizationOptions: [
      {
        name: 'Quantity',
        choices: [
          { name: '500 g', price: -85 },
          { name: '1 kg', price: 0 },
          { name: '2 kg', price: 160 },
        ],
        default: '1 kg',
      },
    ],
  }),
  it(6, 'Seasonal Fruit Basket', 499, u('mix-fruit.webp'), 'Curated mix, ~3 kg', {
    isVeg: true,
    attributes: { isChefSpecial: true },
  }),
  it(7, 'Pet Food - Dog (3kg)', 1299, u('dog-food.webp'), 'Chicken & rice, adult'),
  it(8, 'Pet Food - Cat (1.5kg)', 999, u('petfood.webp'), 'Ocean fish, adult'),
  it(9, 'Dog Leash', 499, u('petfood.webp'), 'Nylon, reflective, 1.5m'),
  it(10, 'Cat Toy - Feather Wand', 299, u('caters.webp'), 'Interactive, natural feathers'),
  it(11, 'Pet Bed (Medium)', 1499, u('bed.webp'), 'Washable cover, non-slip base'),
  it(12, 'Aquarium Fish Tank (20L)', 3499, u('fish-salmon.webp'), 'With filter and LED'),
  it(13, 'Toy Building Blocks (500 pcs)', 1499, u('blocks.webp'), 'Ages 5+, compatible with major brands'),
  it(14, 'Remote Control Car', 1999, u('remote-car.webp'), '1:16 scale, 2.4GHz'),
  it(15, 'Board Game - Strategy', 1299, u('apple-puzzle.webp'), '2-6 players, ages 10+'),
  it(16, 'Puzzle - 1000 pieces', 699, u('apple-puzzle.webp'), 'Landscape, premium print'),
  it(17, 'Doll - Assorted', 599, u('bear.webp'), 'Soft body, ages 3+'),
  it(18, 'Art & Craft Kit', 899, u('show.webp'), 'Colours, brushes, paper included'),
  it(19, 'Hammer (Claw)', 599, u('hammer.webp'), 'Steel head, rubber grip'),
  it(20, 'Screwdriver Set (12 pcs)', 899, u('hammer.webp'), 'Magnetic tips, case included'),
  it(21, 'Measuring Tape (5m)', 299, u('calender-cup.webp'), 'Auto-lock, belt clip'),
  it(22, 'Paint Roller Set', 499, u('cooking.webp'), 'Includes tray and brush'),
  it(23, 'Drill Machine (Cordless)', 3999, u('hammer.webp'), '18V, 2 batteries'),
  it(24, 'Toolbox (20")', 1499, u('hammer.webp'), 'Metal latch, tray insert'),
  it(25, 'Whiskey (750ml)', 2499, u('vine.webp'), 'Single malt, aged 12 years'),
  it(26, 'Wine (Red, 750ml)', 999, u('vine.webp'), 'Cabernet Sauvignon, reserve'),
  it(27, 'Craft Beer (Pack of 6)', 899, u('juice.webp'), 'Assorted IPAs'),
  it(28, 'Vodka (750ml)', 1799, u('juice.webp'), 'Triple distilled'),
  it(29, 'Fresh Juice - Orange (1L)', 149, u('juice.webp'), 'Cold-pressed, no sugar'),
  it(30, 'Sparkling Water (Pack of 6)', 299, u('juice.webp'), '500ml bottles'),
];

export const OTHER_SHOPS_DEFAULTS: CategoryDefaults = {
  bannerUrl:
    'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/assets/mix-fruit.webp',
  items: OTHER_SHOPS_ITEMS,
};