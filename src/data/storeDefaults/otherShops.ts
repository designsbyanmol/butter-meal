// src/data/storeDefaults/otherShops.ts
import { it, u, type CategoryDefaults } from './types';

const OTHER_SHOPS_ITEMS = [
  it(1, 'Fresh Tomatoes (1 kg)', 40, u('1592924357228-91a4daadcfea'), 'Farm-fresh, ripe red tomatoes', {
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
  it(2, 'Onions (1 kg)', 35, u('1580209797991-1a9f99a37105'), 'Fresh yellow onions', {
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
  it(3, 'Potatoes (1 kg)', 30, u('1518977676601-b53f82aba655'), 'Washed, all-purpose', {
    isVeg: true,
  }),
  it(4, 'Bananas (Dozen)', 60, u('1571771894821-ce9b6c11b08e'), 'Ripe Robusta bananas', {
    isVeg: true,
    attributes: { isPopular: true },
  }),
  it(5, 'Apples - Shimla (1 kg)', 180, u('1560806887-1e4cd0b6cbd6'), 'Crisp, sweet-tart', {
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
  it(6, 'Seasonal Fruit Basket', 499, u('1610832958506-aa56368176cf'), 'Curated mix, ~3 kg', {
    isVeg: true,
    attributes: { isChefSpecial: true },
  }),
  it(7, 'Pet Food - Dog (3kg)', 1299, u('1589924691995-400dc9ecc119'), 'Chicken & rice, adult'),
  it(8, 'Pet Food - Cat (1.5kg)', 999, u('1589924691995-400dc9ecc119'), 'Ocean fish, adult'),
  it(9, 'Dog Leash', 499, u('1601758228041-f3b2795255f1'), 'Nylon, reflective, 1.5m'),
  it(10, 'Cat Toy - Feather Wand', 299, u('1595234343306-6f1b8f1f5f8f'), 'Interactive, natural feathers'),
  it(11, 'Pet Bed (Medium)', 1499, u('1601758228041-f3b2795255f1'), 'Washable cover, non-slip base'),
  it(12, 'Aquarium Fish Tank (20L)', 3499, u('1522064165672-8c1b5b8e0b8f'), 'With filter and LED'),
  it(13, 'Toy Building Blocks (500 pcs)', 1499, u('1587654780291-39c9404d746b'), 'Ages 5+, compatible with major brands'),
  it(14, 'Remote Control Car', 1999, u('1594736797933-d0501ba2fe65'), '1:16 scale, 2.4GHz'),
  it(15, 'Board Game - Strategy', 1299, u('1606503154546-6f4c4a3c0b5f'), '2-6 players, ages 10+'),
  it(16, 'Puzzle - 1000 pieces', 699, u('1606503154546-6f4c4a3c0b5f'), 'Landscape, premium print'),
  it(17, 'Doll - Assorted', 599, u('1587654780291-39c9404d746b'), 'Soft body, ages 3+'),
  it(18, 'Art & Craft Kit', 899, u('1587654780291-39c9404d746b'), 'Colours, brushes, paper included'),
  it(19, 'Hammer (Claw)', 599, u('1581244277943-fe4a9c777189'), 'Steel head, rubber grip'),
  it(20, 'Screwdriver Set (12 pcs)', 899, u('1581244277943-fe4a9c777189'), 'Magnetic tips, case included'),
  it(21, 'Measuring Tape (5m)', 299, u('1581244277943-fe4a9c777189'), 'Auto-lock, belt clip'),
  it(22, 'Paint Roller Set', 499, u('1581244277943-fe4a9c777189'), 'Includes tray and brush'),
  it(23, 'Drill Machine (Cordless)', 3999, u('1581244277943-fe4a9c777189'), '18V, 2 batteries'),
  it(24, 'Toolbox (20")', 1499, u('1581244277943-fe4a9c777189'), 'Metal latch, tray insert'),
  it(25, 'Whiskey (750ml)', 2499, u('1527285783387-6c1c3f2c3d3c'), 'Single malt, aged 12 years'),
  it(26, 'Wine (Red, 750ml)', 999, u('1510812431401-41d2bd2722f3'), 'Cabernet Sauvignon, reserve'),
  it(27, 'Craft Beer (Pack of 6)', 899, u('1608270586620-248524c67de9'), 'Assorted IPAs'),
  it(28, 'Vodka (750ml)', 1799, u('1608270586620-248524c67de9'), 'Triple distilled'),
  it(29, 'Fresh Juice - Orange (1L)', 149, u('1600271886742-f049cd451bba'), 'Cold-pressed, no sugar'),
  it(30, 'Sparkling Water (Pack of 6)', 299, u('1600271886742-f049cd451bba'), '500ml bottles'),
];

export const OTHER_SHOPS_DEFAULTS: CategoryDefaults = {
  bannerUrl:
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80&auto=format&fit=crop',
  items: OTHER_SHOPS_ITEMS,
};