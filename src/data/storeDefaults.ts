// src/data/storeDefaults.ts
import { MenuItem, StoreCategory } from '../types';
import { menuItems as restaurantItems } from './menuData';

export interface CategoryDefaults {
  bannerUrl: string;
  items: MenuItem[];
}

/** Shorthand: build a MenuItem quickly. */
const it = (
  id: number,
  name: string,
  price: number,
  img: string,
  desc: string,
): MenuItem => ({
  id,
  inStock: true,
  name,
  desc,
  price,
  img,
  isVeg: false,
  attributes: {},
});

/** Unsplash helper. w=800 gives a reasonable card size. */
const u = (id: string): string =>
  `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

// =========================================================
// FOOD & BEVERAGE
// Includes: restaurant, drinks-cafe, fast-food,
// specialty-food, sweets-desserts, meat-seafood.
// =========================================================
const FOOD_BEVERAGE_ITEMS: MenuItem[] = [
  // --- Restaurant / mains ---
  it(1, 'Margherita Pizza (10")', 299, u('1513104890138-7c749659a591'), 'Tomato, mozzarella, fresh basil'),
  it(2, 'Classic Cheeseburger', 249, u('1568901346375-23c9450c58cd'), 'Beef patty, cheddar, lettuce, tomato'),
  it(3, 'Butter Chicken', 349, u('1603894584373-5ac82b2ae398'), 'Creamy tomato gravy, tender chicken'),
  it(4, 'Paneer Butter Masala', 299, u('1631452180519-c014fe946bc7'), 'Rich, mild paneer curry'),
  it(5, 'Veg Biryani', 249, u('1563379091339-03b21ab4a4f8'), 'Fragrant basmati, mixed vegetables'),
  // --- Fast food ---
  it(6, 'Chicken Wings (6 pcs)', 269, u('1608039755401-742074f0548d'), 'Buffalo or BBQ, ranch dip'),
  it(7, 'French Fries (Regular)', 99, u('1573080496219-bb080dd4f877'), 'Crispy golden fries, sea salt'),
  it(8, 'Chicken Wrap', 229, u('1626700051175-6818013e1d4f'), 'Grilled chicken, veggies, tortilla'),
  // --- Drinks & café ---
  it(9, 'Cappuccino', 180, u('1572442388796-11668a67e53d'), 'Espresso with steamed milk foam'),
  it(10, 'Cold Brew', 220, u('1517701550927-30cf4ba1dba5'), 'Slow-steeped, served over ice'),
  it(11, 'Masala Chai', 100, u('1571934811356-5cc061b6821f'), 'Spiced Indian tea with milk'),
  it(12, 'Mango Smoothie', 220, u('1623065625245-0340c4abdd7b'), 'Alphonso mango, yogurt, honey'),
  // --- Sweets & desserts ---
  it(13, 'Chocolate Truffle Cake (Slice)', 249, u('1578985545062-69928b1d9587'), 'Dense chocolate sponge, ganache'),
  it(14, 'Gulab Jamun (4 pcs)', 149, u('1601303516572-5e3d5a05c1b1'), 'Milk dumplings in rose syrup'),
  // --- Meat & seafood (specialty) ---
  it(15, 'Salmon Nigiri (2 pcs)', 299, u('1579871494447-9811cf80d66c'), 'Fresh salmon over rice'),
  it(16, 'Prawns (500g)', 549, u('1565680018434-b513d5e20873'), 'Medium, cleaned and deveined'),
];

// =========================================================
// GROCERY & DAILY NEEDS
// =========================================================
const GROCERY_ITEMS: MenuItem[] = [
  it(1, 'Basmati Rice (1 kg)', 179, u('1586201375761-83865001e31c'), 'Premium aged long-grain rice'),
  it(2, 'Toor Dal (1 kg)', 149, u('1585997443218-0ea8de4d10e0'), 'Unpolished split pigeon peas'),
  it(3, 'Wheat Atta (5 kg)', 299, u('1601050690597-df0568f70950'), 'Whole wheat chakki-fresh flour'),
  it(4, 'Sunflower Oil (1 L)', 149, u('1474979266404-7eaacbcd87c5'), 'Refined sunflower cooking oil'),
  it(5, 'Fresh Tomatoes (1 kg)', 40, u('1592924357228-91a4daadcfea'), 'Farm-fresh red tomatoes'),
  it(6, 'Onions (1 kg)', 35, u('1518977676601-b53f82aba655'), 'Fresh red onions'),
  it(7, 'Potatoes (1 kg)', 30, u('1518977676601-b53f82aba655'), 'Fresh, washed potatoes'),
  it(8, 'Full Cream Milk (1 L)', 68, u('1550583724-b2692b85b150'), 'Pasteurised, homogenised'),
  it(9, 'Paneer (200g)', 99, u('1631452180519-c014fe946bc7'), 'Fresh cottage cheese block'),
  it(10, 'Curd / Dahi (400g)', 45, u('1488477181946-6428a0291777'), 'Set curd, thick and creamy'),
  it(11, 'Eggs (12 pcs)', 84, u('1582722872445-44dc5f7e3c8f'), 'Farm-fresh brown eggs'),
  it(12, 'Bread Loaf (400g)', 45, u('1509440159596-0249088772ff'), 'Soft white sandwich bread'),
  it(13, 'Tea Powder (500g)', 249, u('1597318181409-cf64d0b5d8a2'), 'Premium CTC blend'),
  it(14, 'Sugar (1 kg)', 45, u('1581449659298-a27a9d0ccb81'), 'Refined white sugar'),
  it(15, 'Salt (1 kg)', 25, u('1518110841586-6d1b896dbcb5'), 'Iodised table salt'),
  it(16, 'Biscuits Assorted (Pack of 6)', 120, u('1558961363-fa8fdf82db35'), 'Cookies and cream biscuits'),
];

// =========================================================
// FASHION & LIFESTYLE
// Includes: clothing-jewelry, health-beauty.
// =========================================================
const FASHION_LIFESTYLE_ITEMS: MenuItem[] = [
  it(1, 'Cotton Crew T-Shirt', 799, u('1521572163474-6864f9cf17ab'), 'Unisex, multiple colors'),
  it(2, 'Slim-Fit Denim Jeans', 1899, u('1542272604-787c3835535d'), 'Stretch denim, mid-rise'),
  it(3, 'Floral Summer Dress', 2199, u('1595777457583-95e059d581b8'), 'Midi length, breathable'),
  it(4, 'Kurta Set (Men)', 2499, u('1610180318691-1e67dbfad3dd'), 'Cotton blend, festive'),
  it(5, 'Saree (Silk Blend)', 3499, u('1610030469983-98e550d6193c'), 'Traditional, with blouse piece'),
  it(6, 'Running Sneakers', 3299, u('1542291026-7eec264c27ff'), 'Cushioned, breathable mesh'),
  it(7, 'Leather Wallet', 899, u('1627123424574-724758594e93'), 'Bifold, RFID-blocking'),
  it(8, 'Silver Chain Necklace', 2499, u('1599643478518-a784e5dc4c8f'), '925 sterling silver, 20"'),
  it(9, 'Gold-Plated Earrings', 1899, u('1535632066927-ab7c9ab60908'), 'Pair, anti-tarnish finish'),
  it(10, 'Designer Sunglasses', 2499, u('1572635196237-14b3f281503f'), 'UV400, unisex frame'),
  it(11, 'Vitamin C Serum', 999, u('1620916566398-39f1143ab7be'), '20% concentration, 30ml'),
  it(12, 'Moisturizer SPF 30', 799, u('1556228720-195a672e8a03'), 'Daily use, 50ml'),
  it(13, 'Perfume (Eau de Parfum)', 2499, u('1541643600914-78b084683601'), '50ml, long-lasting'),
  it(14, 'Lipstick', 799, u('1586495777744-4413f21062fa'), 'Matte finish, assorted shades'),
  it(15, 'Hair Shampoo', 499, u('1585232004423-244e0e6904e3'), 'Sulfate-free, 300ml'),
  it(16, 'Multivitamin (60 tabs)', 699, u('1587854692152-cbe660dbde88'), 'Daily, men & women'),
];

// =========================================================
// HOME & LIVING
// Includes: home-furniture, electronics, sports-garden.
// =========================================================
const HOME_LIVING_ITEMS: MenuItem[] = [
  it(1, '3-Seater Fabric Sofa', 24999, u('1555041469-a586c61ea9bc'), 'Linen upholstery, wooden legs'),
  it(2, 'Queen-Size Bed Frame', 18999, u('1505693416388-ac5ce068fe85'), 'Solid wood, platform style'),
  it(3, '6-Seater Dining Table', 19999, u('1617806118233-18e1de247200'), 'Solid oak, extends to 8-seater'),
  it(4, 'Wardrobe (3-door)', 21999, u('1595428774223-ef52624120d2'), 'With mirror, internal drawers'),
  it(5, 'Study Desk', 6999, u('1518455027359-f3f8164ba6bd'), 'Wooden, with cable management'),
  it(6, 'Floor Lamp', 2999, u('1507473885765-e6ed057f782c'), 'Adjustable, fabric shade'),
  it(7, 'Wireless Earbuds', 2999, u('1590658268037-6bf12165a8df'), 'BT 5.3, 24h battery, ANC'),
  it(8, 'Smart Watch', 8999, u('1523275335684-37898b6baf30'), 'AMOLED, GPS, heart-rate'),
  it(9, 'Bluetooth Speaker', 2499, u('1608043152269-423dbba4e7e1'), 'IPX7 waterproof, 12h playtime'),
  it(10, 'Power Bank 20000mAh', 1999, u('1609091839311-d5365f9ff1c5'), 'Fast charge, dual USB'),
  it(11, 'Smart LED Bulb (Pack of 2)', 1199, u('1550985616-10810253b84d'), '16M colors, app controlled'),
  it(12, 'Yoga Mat (6mm)', 1299, u('1591291621164-2c6367723315'), 'Non-slip, with carry strap'),
  it(13, 'Dumbbell Set (2 x 5kg)', 2499, u('1517836357463-d25dfeac3438'), 'Rubber coated, chrome handles'),
  it(14, 'Garden Trowel Set', 499, u('1416879595882-3373a0480b5b'), '3-piece, stainless steel'),
  it(15, 'Watering Can (5L)', 799, u('1416879595882-3373a0480b5b'), 'Galvanized, long spout'),
  it(16, 'Pruning Shears', 599, u('1416879595882-3373a0480b5b'), 'Bypass, ergonomic grip'),
];

// =========================================================
// BOOKS & OFFICE
// =========================================================
const BOOKS_OFFICE_ITEMS: MenuItem[] = [
  it(1, 'Notebook A5 (Ruled)', 149, u('1531346878377-a5be20888e57'), '200 pages, hardcover'),
  it(2, 'Fountain Pen', 499, u('1583485088034-697b5bc54ccd'), 'Medium nib, refillable'),
  it(3, 'Gel Pen Set (10 pcs)', 199, u('1583485088034-697b5bc54ccd'), 'Assorted colors, 0.5mm'),
  it(4, 'Highlighter Set (6 pcs)', 249, u('1583485088034-697b5bc54ccd'), 'Pastel and neon shades'),
  it(5, 'Sticky Notes (Pack of 5)', 129, u('1531346878377-a5be20888e57'), 'Assorted colors, 3x3 inch'),
  it(6, 'Desk Organizer', 899, u('1544716278-ca5e3f4abd8c'), 'Multi-compartment, wooden'),
  it(7, 'File Folder (Pack of 10)', 349, u('1568667256549-094345857637'), 'A4 size, plastic'),
  it(8, 'Stapler + Staples', 399, u('1587829741301-dc798b83add3'), 'Full-strip, includes 1000 staples'),
  it(9, 'Scissors', 199, u('1587829741301-dc798b83add3'), 'Stainless steel, 8 inch'),
  it(10, 'Whiteboard 2x3 ft', 1499, u('1587829741301-dc798b83add3'), 'Magnetic, with marker tray'),
  it(11, 'Novel – Best Seller', 399, u('1544947950-fa07a98d237f'), 'Assorted titles'),
  it(12, 'Non-Fiction Bestseller', 499, u('1512820790803-83ca734da794'), 'Assorted titles'),
  it(13, 'Children\'s Picture Book', 299, u('1503676260728-1c00da094a0b'), 'Ages 3-7, hardcover'),
  it(14, 'Cookbook – Indian', 799, u('1556910103-1c02745aae4d'), 'Regional recipes, illustrated'),
  it(15, 'Planner 2026', 599, u('1506784983877-45594efa4cbe'), 'Weekly, A5 size'),
  it(16, 'Kindle Paperwhite', 12999, u('1592496431122-2349e0f9ff7a'), '6.8", 16GB, waterproof'),
];

// =========================================================
// SERVICES & EVENTS
// Includes: events-flowers, auto-parts.
// =========================================================
const SERVICES_EVENTS_ITEMS: MenuItem[] = [
  it(1, 'Red Rose Bouquet (12)', 599, u('1518895949257-7621c3c786d7'), 'Fresh long-stem red roses'),
  it(2, 'Mixed Seasonal Bouquet', 799, u('1490750967868-88aa4486c946'), 'Assorted fresh flowers'),
  it(3, 'White Lily Bouquet', 649, u('1519744792095-2f2205e87b6f'), 'Fragrant Oriental lilies'),
  it(4, 'Wedding Centerpiece', 1499, u('1519225421980-715cb0215aed'), 'Custom floral arrangement'),
  it(5, 'Sympathy Wreath', 1299, u('1519225421980-715cb0215aed'), 'White and green standing wreath'),
  it(6, 'Balloon Bouquet (12)', 499, u('1530103862676-de8c9debad1d'), 'Helium-filled assorted colors'),
  it(7, 'Catering – Veg (per person)', 449, u('1555244162-803834f70033'), 'Assorted veg mains, sides, dessert'),
  it(8, 'Catering – Non-Veg (per person)', 599, u('1555939594-58d7cb561ad1'), 'Chicken, mutton, sides, dessert'),
  it(9, 'Chafing Dish Rental', 349, u('1556910103-1c02745aae4d'), 'Per dish, includes fuel'),
  it(10, 'Event Photography (1 hr)', 2999, u('1519741497674-611481863552'), 'Digital album, 50+ edited photos'),
  it(11, 'Fairy Lights (10m)', 299, u('1519225421980-715cb0215aed'), 'Warm white LED string'),
  it(12, 'Table Centerpiece Set', 799, u('1464366400600-7168b8af9bc3'), 'Set of 4, candles included'),
  it(13, 'Engine Oil 5W-30 (4L)', 2299, u('1632823393213-3c4e0a5b5a1a'), 'Fully synthetic, API SP'),
  it(14, 'Brake Pads (Front Pair)', 2499, u('1486263248352-3c4c2f5c6c1f'), 'Ceramic, low-dust'),
  it(15, 'Car Battery 12V 45Ah', 5999, u('1609091839311-d5365f9ff1c5'), 'Maintenance-free, 2-yr warranty'),
  it(16, 'Wiper Blades (Pair)', 899, u('1486263248352-3c4c2f5c6c1f'), 'Beam style, all-weather'),
];

// =========================================================
// OTHER SHOPS
// =========================================================
const OTHER_SHOPS_ITEMS: MenuItem[] = [
  it(1, 'Pet Food – Dog (3kg)', 1299, u('1589924691995-400dc9ecc119'), 'Chicken & rice, adult'),
  it(2, 'Pet Food – Cat (1.5kg)', 999, u('1589924691995-400dc9ecc119'), 'Ocean fish, adult'),
  it(3, 'Dog Leash', 499, u('1601758228041-f3b2795255f1'), 'Nylon, reflective, 1.5m'),
  it(4, 'Cat Toy – Feather Wand', 299, u('1595234343306-6f1b8f1f5f8f'), 'Interactive, natural feathers'),
  it(5, 'Pet Bed (Medium)', 1499, u('1601758228041-f3b2795255f1'), 'Washable cover, non-slip base'),
  it(6, 'Aquarium Fish Tank (20L)', 3499, u('1522064165672-8c1b5b8e0b8f'), 'With filter and LED'),
  it(7, 'Toy Building Blocks (500 pcs)', 1499, u('1587654780291-39c9404d746b'), 'Ages 5+, compatible with major brands'),
  it(8, 'Remote Control Car', 1999, u('1594736797933-d0501ba2fe65'), '1:16 scale, 2.4GHz'),
  it(9, 'Board Game – Strategy', 1299, u('1606503154546-6f4c4a3c0b5f'), '2-6 players, ages 10+'),
  it(10, 'Puzzle – 1000 pieces', 699, u('1606503154546-6f4c4a3c0b5f'), 'Landscape, premium print'),
  it(11, 'Hammer (Claw)', 599, u('1581244277943-fe4a9c777189'), 'Steel head, rubber grip'),
  it(12, 'Screwdriver Set (12 pcs)', 899, u('1581244277943-fe4a9c777189'), 'Magnetic tips, case included'),
  it(13, 'Measuring Tape (5m)', 299, u('1581244277943-fe4a9c777189'), 'Auto-lock, belt clip'),
  it(14, 'Paint Roller Set', 499, u('1581244277943-fe4a9c777189'), 'Includes tray and brush'),
  it(15, 'Whiskey (750ml)', 2499, u('1527285783387-6c1c3f2c3d3c'), 'Single malt, aged 12 years'),
  it(16, 'Wine (Red, 750ml)', 999, u('1510812431401-41d2bd2722f3'), 'Cabernet Sauvignon, reserve'),
];

// =========================================================
// MAP: category → { bannerUrl, items }
// =========================================================
export const CATEGORY_DEFAULTS: Record<StoreCategory, CategoryDefaults> = {
  'food-beverage': {
    bannerUrl:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80&auto=format&fit=crop',
    items: FOOD_BEVERAGE_ITEMS,
  },
  'grocery-daily': {
    bannerUrl:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=80&auto=format&fit=crop',
    items: GROCERY_ITEMS,
  },
  'fashion-lifestyle': {
    bannerUrl:
      'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1600&q=80&auto=format&fit=crop',
    items: FASHION_LIFESTYLE_ITEMS,
  },
  'home-living': {
    bannerUrl:
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&q=80&auto=format&fit=crop',
    items: HOME_LIVING_ITEMS,
  },
  'books-office': {
    bannerUrl:
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1600&q=80&auto=format&fit=crop',
    items: BOOKS_OFFICE_ITEMS,
  },
  'services-events': {
    bannerUrl:
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1600&q=80&auto=format&fit=crop',
    items: SERVICES_EVENTS_ITEMS,
  },
  'other-shops': {
    bannerUrl:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80&auto=format&fit=crop',
    items: OTHER_SHOPS_ITEMS,
  },
};

export const getCategoryDefaults = (
  category: StoreCategory | undefined,
): CategoryDefaults =>
  CATEGORY_DEFAULTS[category ?? 'food-beverage'] ??
  CATEGORY_DEFAULTS['food-beverage'];