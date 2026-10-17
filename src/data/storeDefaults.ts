// src/data/storeDefaults.ts
import { MenuItem, StoreCategory } from '../types';

export interface CategoryDefaults {
  bannerUrl: string;
  items: MenuItem[];
}

// =========================================================
// Builders
// =========================================================
type BuildOverrides = Partial<Omit<MenuItem, 'id' | 'name' | 'price' | 'img' | 'desc'>>;

/**
 * Shorthand: build a MenuItem with sensible defaults. Any property
 * on `overrides` wins, including customizations, ingredients,
 * nutritional info, attributes, discount, cost price, etc.
 */
const it = (
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

/** Unsplash helper. w=800 gives a reasonable card size. */
const u = (id: string): string =>
  `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

// =========================================================
// FOOD & BEVERAGE
// Sub-shops: restaurant, cafe, fast-food, sweets, meat/seafood
// =========================================================
const FOOD_BEVERAGE_ITEMS: MenuItem[] = [
  // --- Restaurant / mains ---
  it(1, 'Margherita Pizza (10")', 299, u('1513104890138-7c749659a591'), 'Tomato, mozzarella, fresh basil', {
    isVeg: true,
    costPrice: 349,
    preparationTime: '15 min',
    calories: 850,
    ingredients: ['Pizza dough', 'Tomato sauce', 'Mozzarella', 'Basil'],
    nutritionalInfo: { protein: '28g', carbs: '92g', fat: '26g', fiber: '4g' },
    attributes: { isPopular: true },
    customizationOptions: [
      {
        name: 'Size',
        choices: [
          { name: 'Regular 8"', price: 0 },
          { name: 'Medium 10"', price: 80 },
          { name: 'Large 12"', price: 160 },
        ],
        default: 'Medium 10"',
      },
      {
        name: 'Crust',
        choices: [
          { name: 'Classic Hand-Tossed', price: 0 },
          { name: 'Thin Crust', price: 0 },
          { name: 'Cheese Burst', price: 60 },
        ],
        default: 'Classic Hand-Tossed',
      },
      {
        name: 'Extra Toppings',
        choices: [
          { name: 'Extra Cheese', price: 50 },
          { name: 'Olives', price: 30 },
          { name: 'Jalapeños', price: 30 },
          { name: 'Mushrooms', price: 40 },
        ],
      },
    ],
  }),
  it(2, 'Classic Cheeseburger', 249, u('1568901346375-23c9450c58cd'), 'Beef patty, cheddar, lettuce, tomato', {
    costPrice: 289,
    preparationTime: '12 min',
    calories: 720,
    ingredients: ['Beef patty', 'Cheddar', 'Lettuce', 'Tomato', 'Bun'],
    nutritionalInfo: { protein: '34g', carbs: '48g', fat: '38g', fiber: '3g' },
    customizationOptions: [
      {
        name: 'Patty',
        choices: [
          { name: 'Single', price: 0 },
          { name: 'Double', price: 90 },
        ],
        default: 'Single',
      },
      {
        name: 'Add-ons',
        choices: [
          { name: 'Bacon', price: 60 },
          { name: 'Fried Egg', price: 40 },
          { name: 'Dozzelodo', price: 50 },
        ],
      },
    ],
  }),
  it(3, 'Butter Chicken', 349, u('1603894584373-5ac82b2ae398'), 'Creamy tomato gravy, tender chicken', {
    isSpicy: true,
    costPrice: 389,
    preparationTime: '20 min',
    calories: 640,
    ingredients: ['Chicken', 'Tomato', 'Cream', 'Butter', 'Spices'],
    nutritionalInfo: { protein: '38g', carbs: '18g', fat: '42g', fiber: '3g' },
    attributes: { isChefSpecial: true },
    customizationOptions: [
      {
        name: 'Spice Level',
        choices: [
          { name: 'Mild', price: 0 },
          { name: 'Medium', price: 0 },
          { name: 'Hot', price: 0 },
        ],
        default: 'Medium',
      },
      {
        name: 'Portion',
        choices: [
          { name: 'Half', price: 0 },
          { name: 'Full', price: 120 },
        ],
        default: 'Full',
      },
    ],
  }),
  it(4, 'Paneer Butter Masala', 299, u('1631452180519-c014fe946bc7'), 'Rich, mild paneer curry', {
    isVeg: true,
    costPrice: 339,
    preparationTime: '18 min',
    calories: 560,
    ingredients: ['Paneer', 'Tomato', 'Cream', 'Butter', 'Cashew'],
    nutritionalInfo: { protein: '22g', carbs: '24g', fat: '38g', fiber: '4g' },
    attributes: { isPopular: true },
    customizationOptions: [
      {
        name: 'Spice Level',
        choices: [
          { name: 'Mild', price: 0 },
          { name: 'Medium', price: 0 },
          { name: 'Hot', price: 0 },
        ],
        default: 'Mild',
      },
    ],
  }),
  it(5, 'Veg Biryani', 249, u('1563379091339-03b21ab4a4f8'), 'Fragrant basmati, mixed vegetables', {
    isVeg: true,
    costPrice: 289,
    preparationTime: '25 min',
    calories: 620,
    ingredients: ['Basmati rice', 'Mixed vegetables', 'Saffron', 'Yogurt', 'Spices'],
    nutritionalInfo: { protein: '14g', carbs: '98g', fat: '16g', fiber: '6g' },
    customizationOptions: [
      {
        name: 'Portion',
        choices: [
          { name: 'Single', price: 0 },
          { name: 'Family (Serves 3)', price: 200 },
        ],
        default: 'Single',
      },
    ],
  }),
  it(6, 'Chicken Wings (6 pcs)', 269, u('1608039755401-742074f0548d'), 'Buffalo or BBQ, ranch dip', {
    isSpicy: true,
    costPrice: 299,
    preparationTime: '15 min',
    calories: 480,
    customizationOptions: [
      {
        name: 'Sauce',
        choices: [
          { name: 'Buffalo', price: 0 },
          { name: 'BBQ', price: 0 },
          { name: 'Honey Sriracha', price: 0 },
        ],
        default: 'Buffalo',
      },
      {
        name: 'Quantity',
        choices: [
          { name: '6 pcs', price: 0 },
          { name: '12 pcs', price: 220 },
        ],
        default: '6 pcs',
      },
    ],
  }),
  it(7, 'French Fries (Regular)', 99, u('1573080496219-bb080dd4f877'), 'Crispy golden fries, sea salt', {
    isVeg: true,
    costPrice: 119,
    preparationTime: '8 min',
    calories: 320,
    attributes: { isPopular: true },
    customizationOptions: [
      {
        name: 'Size',
        choices: [
          { name: 'Regular', price: 0 },
          { name: 'Large', price: 50 },
        ],
        default: 'Regular',
      },
      {
        name: 'Seasoning',
        choices: [
          { name: 'Sea Salt', price: 0 },
          { name: 'Peri Peri', price: 20 },
          { name: 'Cheese', price: 40 },
        ],
        default: 'Sea Salt',
      },
    ],
  }),
  it(8, 'Chicken Wrap', 229, u('1626700051175-6818013e1d4f'), 'Grilled chicken, veggies, tortilla', {
    costPrice: 259,
    preparationTime: '12 min',
    calories: 480,
    customizationOptions: [
      {
        name: 'Sauce',
        choices: [
          { name: 'Garlic Mayo', price: 0 },
          { name: 'Peri Peri', price: 0 },
          { name: 'Chipotle', price: 20 },
        ],
        default: 'Garlic Mayo',
      },
    ],
  }),
  it(9, 'Cappuccino', 180, u('1572442388796-11668a67e53d'), 'Espresso with steamed milk foam', {
    isVeg: true,
    costPrice: 200,
    preparationTime: '5 min',
    calories: 120,
    attributes: { isPopular: true },
    customizationOptions: [
      {
        name: 'Size',
        choices: [
          { name: 'Small (8 oz)', price: 0 },
          { name: 'Medium (12 oz)', price: 40 },
          { name: 'Large (16 oz)', price: 70 },
        ],
        default: 'Medium (12 oz)',
      },
      {
        name: 'Milk',
        choices: [
          { name: 'Whole Milk', price: 0 },
          { name: 'Skim Milk', price: 0 },
          { name: 'Oat Milk', price: 30 },
          { name: 'Almond Milk', price: 30 },
        ],
        default: 'Whole Milk',
      },
      {
        name: 'Extra Shot',
        choices: [
          { name: 'No', price: 0 },
          { name: 'Yes (+1 shot)', price: 40 },
        ],
        default: 'No',
      },
    ],
  }),
  it(10, 'Cold Brew', 220, u('1517701550927-30cf4ba1dba5'), 'Slow-steeped, served over ice', {
    isVeg: true,
    costPrice: 240,
    preparationTime: '3 min',
    calories: 15,
    customizationOptions: [
      {
        name: 'Size',
        choices: [
          { name: 'Regular', price: 0 },
          { name: 'Large', price: 50 },
        ],
        default: 'Regular',
      },
      {
        name: 'Sweetener',
        choices: [
          { name: 'None', price: 0 },
          { name: 'Simple Syrup', price: 0 },
          { name: 'Vanilla', price: 20 },
          { name: 'Caramel', price: 20 },
        ],
        default: 'None',
      },
    ],
  }),
  it(11, 'Masala Chai', 100, u('1571934811356-5cc061b6821f'), 'Spiced Indian tea with milk', {
    isVeg: true,
    preparationTime: '5 min',
    calories: 90,
    customizationOptions: [
      {
        name: 'Sugar',
        choices: [
          { name: 'No Sugar', price: 0 },
          { name: 'Less Sugar', price: 0 },
          { name: 'Regular', price: 0 },
        ],
        default: 'Regular',
      },
    ],
  }),
  it(12, 'Mango Smoothie', 220, u('1623065625245-0340c4abdd7b'), 'Alphonso mango, yogurt, honey', {
    isVeg: true,
    preparationTime: '6 min',
    calories: 220,
    attributes: { isNew: true },
    customizationOptions: [
      {
        name: 'Size',
        choices: [
          { name: 'Regular', price: 0 },
          { name: 'Large', price: 60 },
        ],
        default: 'Regular',
      },
    ],
  }),
  it(13, 'Chocolate Truffle Cake (Slice)', 249, u('1578985545062-69928b1d9587'), 'Dense chocolate sponge, ganache', {
    isVeg: true,
    preparationTime: '5 min',
    calories: 480,
    customizationOptions: [
      {
        name: 'Portion',
        choices: [
          { name: 'Slice', price: 0 },
          { name: 'Half Kg', price: 550 },
          { name: 'Full Kg', price: 1050 },
        ],
        default: 'Slice',
      },
      {
        name: 'Add-on',
        choices: [
          { name: 'Candle', price: 20 },
          { name: 'Message on Cake', price: 50 },
        ],
      },
    ],
  }),
  it(14, 'Gulab Jamun (4 pcs)', 149, u('1601303516572-5e3d5a05c1b1'), 'Milk dumplings in rose syrup', {
    isVeg: true,
    preparationTime: '5 min',
    calories: 340,
    attributes: { isPopular: true },
  }),
  it(15, 'Salmon Nigiri (2 pcs)', 299, u('1579871494447-9811cf80d66c'), 'Fresh salmon over rice', {
    preparationTime: '8 min',
    calories: 180,
    attributes: { isChefSpecial: true },
  }),
  it(16, 'Prawns (500g)', 549, u('1565680018434-b513d5e20873'), 'Medium, cleaned and deveined', {
    preparationTime: '20 min',
    calories: 420,
    attributes: { isLimited: true },
  }),
];

// =========================================================
// FASHION & LIFESTYLE
// Sub-shops: clothing, footwear+accessories, beauty+wellness
// =========================================================
const FASHION_LIFESTYLE_ITEMS: MenuItem[] = [
  // --- Clothing ---
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

// =========================================================
// HOME & LIVING
// Sub-shops: furniture, electronics, sports+garden
// =========================================================
const HOME_LIVING_ITEMS: MenuItem[] = [
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

// =========================================================
// BOOKS & OFFICE
// Sub-shops: stationery, books, office equipment
// =========================================================
const BOOKS_OFFICE_ITEMS: MenuItem[] = [
  it(1, 'Notebook A5 (Ruled)', 149, u('1531346878377-a5be20888e57'), '200 pages, hardcover'),
  it(2, 'Fountain Pen', 499, u('1583485088034-697b5bc54ccd'), 'Medium nib, refillable', {
    customizationOptions: [
      {
        name: 'Ink Color',
        choices: [
          { name: 'Blue', price: 0 },
          { name: 'Black', price: 0 },
          { name: 'Green', price: 0 },
        ],
        default: 'Blue',
      },
    ],
  }),
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
// Sub-shops (4): flowers/gifts, catering/events, photography,
// salons & spas. 6 items each = 24 total.
// =========================================================
const SERVICES_EVENTS_ITEMS: MenuItem[] = [
  // --- Flowers & Gifts (6) ---
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

  // --- Catering & Events (6) ---
  it(7, 'Catering – Veg (per person)', 449, u('1555244162-803834f70033'), 'Assorted veg mains, sides, dessert', {
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
  it(8, 'Catering – Non-Veg (per person)', 599, u('1555939594-58d7cb561ad1'), 'Chicken, mutton, sides, dessert', {
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

  // --- Salons & Spas (6) ---
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
  it(15, 'Facial – Hydrating', 1299, u('1570172619644-dfd03ed5d881'), '60 min, cleanser + mask + massage'),
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

  // --- Auto Parts (6) - keeps the "auto-parts" flavour from the original ---
  it(19, 'Engine Oil 5W-30 (4L)', 2299, u('1632823393213-3c4e0a5b5a1a'), 'Fully synthetic, API SP'),
  it(20, 'Brake Pads (Front Pair)', 2499, u('1486263248352-3c4c2f5c6c1f'), 'Ceramic, low-dust'),
  it(21, 'Car Battery 12V 45Ah', 5999, u('1609091839311-d5365f9ff1c5'), 'Maintenance-free, 2-yr warranty'),
  it(22, 'Wiper Blades (Pair)', 899, u('1486263248352-3c4c2f5c6c1f'), 'Beam style, all-weather'),
  it(23, 'Air Filter', 699, u('1632823393213-3c4e0a5b5a1a'), 'High-flow, washable'),
  it(24, 'Spark Plug Set (4)', 1299, u('1632823393213-3c4e0a5b5a1a'), 'Iridium tip, long-life'),
];

// =========================================================
// OTHER SHOPS
// Sub-shops: vegetables & fruits, pet supplies, toys,
// tools & hardware, beverages.
// =========================================================
const OTHER_SHOPS_ITEMS: MenuItem[] = [
  // --- Vegetables & Fruits (6) - NEW ---
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
  it(5, 'Apples – Shimla (1 kg)', 180, u('1560806887-1e4cd0b6cbd6'), 'Crisp, sweet-tart', {
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

  // --- Pet Supplies (6) ---
  it(7, 'Pet Food – Dog (3kg)', 1299, u('1589924691995-400dc9ecc119'), 'Chicken & rice, adult'),
  it(8, 'Pet Food – Cat (1.5kg)', 999, u('1589924691995-400dc9ecc119'), 'Ocean fish, adult'),
  it(9, 'Dog Leash', 499, u('1601758228041-f3b2795255f1'), 'Nylon, reflective, 1.5m'),
  it(10, 'Cat Toy – Feather Wand', 299, u('1595234343306-6f1b8f1f5f8f'), 'Interactive, natural feathers'),
  it(11, 'Pet Bed (Medium)', 1499, u('1601758228041-f3b2795255f1'), 'Washable cover, non-slip base'),
  it(12, 'Aquarium Fish Tank (20L)', 3499, u('1522064165672-8c1b5b8e0b8f'), 'With filter and LED'),

  // --- Toys & Games (6) ---
  it(13, 'Toy Building Blocks (500 pcs)', 1499, u('1587654780291-39c9404d746b'), 'Ages 5+, compatible with major brands'),
  it(14, 'Remote Control Car', 1999, u('1594736797933-d0501ba2fe65'), '1:16 scale, 2.4GHz'),
  it(15, 'Board Game – Strategy', 1299, u('1606503154546-6f4c4a3c0b5f'), '2-6 players, ages 10+'),
  it(16, 'Puzzle – 1000 pieces', 699, u('1606503154546-6f4c4a3c0b5f'), 'Landscape, premium print'),
  it(17, 'Doll – Assorted', 599, u('1587654780291-39c9404d746b'), 'Soft body, ages 3+'),
  it(18, 'Art & Craft Kit', 899, u('1587654780291-39c9404d746b'), 'Colours, brushes, paper included'),

  // --- Tools & Hardware (6) ---
  it(19, 'Hammer (Claw)', 599, u('1581244277943-fe4a9c777189'), 'Steel head, rubber grip'),
  it(20, 'Screwdriver Set (12 pcs)', 899, u('1581244277943-fe4a9c777189'), 'Magnetic tips, case included'),
  it(21, 'Measuring Tape (5m)', 299, u('1581244277943-fe4a9c777189'), 'Auto-lock, belt clip'),
  it(22, 'Paint Roller Set', 499, u('1581244277943-fe4a9c777189'), 'Includes tray and brush'),
  it(23, 'Drill Machine (Cordless)', 3999, u('1581244277943-fe4a9c777189'), '18V, 2 batteries'),
  it(24, 'Toolbox (20")', 1499, u('1581244277943-fe4a9c777189'), 'Metal latch, tray insert'),

  // --- Beverages (6) ---
  it(25, 'Whiskey (750ml)', 2499, u('1527285783387-6c1c3f2c3d3c'), 'Single malt, aged 12 years'),
  it(26, 'Wine (Red, 750ml)', 999, u('1510812431401-41d2bd2722f3'), 'Cabernet Sauvignon, reserve'),
  it(27, 'Craft Beer (Pack of 6)', 899, u('1608270586620-248524c67de9'), 'Assorted IPAs'),
  it(28, 'Vodka (750ml)', 1799, u('1608270586620-248524c67de9'), 'Triple distilled'),
  it(29, 'Fresh Juice – Orange (1L)', 149, u('1600271886742-f049cd451bba'), 'Cold-pressed, no sugar'),
  it(30, 'Sparkling Water (Pack of 6)', 299, u('1600271886742-f049cd451bba'), '500ml bottles'),
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