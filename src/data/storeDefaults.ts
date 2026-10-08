// src/data/storeDefaults.ts
import { MenuItem, StoreCategory } from '../types';
import { menuItems as restaurantItems } from './menuData';

export interface CategoryDefaults {
  /** Hero image shown above the store's menu/catalog. */
  bannerUrl: string;
  /** Default products/items for this category. */
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
// RESTAURANT - re-use the existing menuData file
// =========================================================
const RESTAURANT_ITEMS = restaurantItems;

// =========================================================
// DRINKS & CAFÉS
// =========================================================
const DRINKS_ITEMS: MenuItem[] = [
  it(1,  'Espresso',                 120, u('1510591509098-f4fdc6d0ff04'), 'Single shot, rich and bold'),
  it(2,  'Cappuccino',               180, u('1572442388796-11668a67e53d'), 'Espresso with steamed milk foam'),
  it(3,  'Caffè Latte',              190, u('1461023058943-07fcbe16d735'), 'Smooth espresso with milk'),
  it(4,  'Flat White',               200, u('1517701550927-30cf4ba1dba5'), 'Velvety microfoam over ristretto'),
  it(5,  'Cold Brew',                220, u('1517701550927-30cf4ba1dba5'), 'Slow-steeped, served over ice'),
  it(6,  'Iced Americano',           160, u('1554866585-cd94860890b7'), 'Espresso, cold water, ice'),
  it(7,  'Matcha Latte',             240, u('1536256263959-770b48d82b0a'), 'Ceremonial-grade matcha + milk'),
  it(8,  'Masala Chai',              100, u('1571934811356-5cc061b6821f'), 'Spiced Indian tea with milk'),
  it(9,  'Green Tea',                120, u('1544787219-7f47ccb76574'), 'Whole-leaf sencha'),
  it(10, 'Hot Chocolate',            200, u('1542990253-a781e04c0082'), 'Belgian cocoa with milk'),
  it(11, 'Fresh Orange Juice',       180, u('1600271886742-f049cd451bba'), 'Cold-pressed, no sugar'),
  it(12, 'Watermelon Juice',         160, u('1587049352846-4a222e784d38'), 'Fresh seasonal watermelon'),
  it(13, 'Mango Smoothie',           220, u('1623065625245-0340c4abdd7b'), 'Alphonso mango, yogurt, honey'),
  it(14, 'Strawberry Milkshake',     240, u('1553530666-ba11a7da3888'), 'Strawberries, milk, ice cream'),
  it(15, 'Cold Coffee',              200, u('1461023058943-07fcbe16d735'), 'Iced coffee with cream'),
  it(16, 'Lemon Iced Tea',           150, u('1499638673689-79a0b5115d87'), 'Fresh lemon, black tea, ice'),
];

// =========================================================
// FAST FOOD & TAKEOUT
// =========================================================
const FAST_FOOD_ITEMS: MenuItem[] = [
  it(1,  'Classic Cheeseburger',     249, u('1568901346375-23c9450c58cd'), 'Beef patty, cheddar, lettuce, tomato'),
  it(2,  'Double Bacon Burger',      379, u('1553979459-d2229ba7433b'), 'Two patties, crispy bacon, cheese'),
  it(3,  'Crispy Chicken Burger',    269, u('1606755962773-d324e0a13086'), 'Fried chicken fillet, mayo, pickles'),
  it(4,  'Veggie Burger',            229, u('1520072959219-c595dc870360'), 'Plant-based patty, avocado, tomato'),
  it(5,  'Margherita Pizza (10")',   299, u('1513104890138-7c749659a591'), 'Tomato, mozzarella, basil'),
  it(6,  'Pepperoni Pizza (10")',    379, u('1628840042765-356cda07504e'), 'Pepperoni, mozzarella, oregano'),
  it(7,  'BBQ Chicken Pizza (10")',  399, u('1565299624946-b28f40a0ae38'), 'BBQ sauce, chicken, red onion'),
  it(8,  'French Fries (Regular)',    99, u('1573080496219-bb080dd4f877'), 'Crispy golden fries, sea salt'),
  it(9,  'Loaded Cheese Fries',      179, u('1585109649139-366815a0d713'), 'Fries with cheese sauce and jalapeños'),
  it(10, 'Onion Rings',              149, u('1639024471283-03518883512d'), 'Beer-battered onion rings'),
  it(11, 'Chicken Wings (6 pcs)',    269, u('1608039755401-742074f0548d'), 'Buffalo or BBQ, ranch dip'),
  it(12, 'Chicken Nuggets (8 pcs)',  199, u('1562967914-608f82629710'), 'Golden nuggets with ketchup'),
  it(13, 'Hot Dog',                  179, u('1612397168436-edbf19f61c54'), 'All-beef hot dog, mustard, relish'),
  it(14, 'Chicken Wrap',             229, u('1626700051175-6818013e1d4f'), 'Grilled chicken, veggies, tortilla'),
  it(15, 'Paneer Wrap',              199, u('1600891964092-4316c288032e'), 'Tandoori paneer, mint chutney'),
  it(16, 'Coleslaw (Side)',           99, u('1625938221144-4a4b8d0e16c8'), 'Creamy cabbage slaw'),
];

// =========================================================
// SPECIALTY FOOD (Sushi etc.)
// =========================================================
const SPECIALTY_ITEMS: MenuItem[] = [
  it(1,  'Salmon Nigiri (2 pcs)',     299, u('1579871494447-9811cf80d66c'), 'Fresh salmon over rice'),
  it(2,  'Tuna Nigiri (2 pcs)',       319, u('1611143669185-af224c5e3252'), 'Bluefin tuna over rice'),
  it(3,  'California Roll (8 pcs)',   349, u('1579584425555-c3ce17fd4351'), 'Crab stick, avocado, cucumber'),
  it(4,  'Spicy Tuna Roll (8 pcs)',   399, u('1617196034183-421b4917c92d'), 'Tuna, spicy mayo, scallion'),
  it(5,  'Dragon Roll (8 pcs)',       449, u('1617196034796-73dfa7b1fd56'), 'Eel, avocado, tobiko'),
  it(6,  'Rainbow Roll (8 pcs)',      499, u('1611143669185-af224c5e3252'), 'Assorted fish over California roll'),
  it(7,  'Veggie Maki (6 pcs)',       249, u('1584270354949-c26b0d5b4a0c'), 'Cucumber, avocado, carrot'),
  it(8,  'Avocado Maki (6 pcs)',      269, u('1607301405390-d831c242f59b'), 'Creamy avocado rolls'),
  it(9,  'Edamame',                   179, u('1610727955541-1c9b2c7e79dc'), 'Steamed soybeans, sea salt'),
  it(10, 'Miso Soup',                 149, u('1547592166-23ac45744acd'), 'Fermented soybean broth'),
  it(11, 'Seaweed Salad',             199, u('1615361200141-f45040f367be'), 'Wakame with sesame dressing'),
  it(12, 'Gyoza (6 pcs)',             249, u('1626804475297-41608ea09aeb'), 'Pan-fried pork dumplings'),
  it(13, 'Yakitori (3 skewers)',      289, u('1553621042-f6e147245754'), 'Grilled chicken skewers'),
  it(14, 'Chicken Katsu',             349, u('1562967914-608f82629710'), 'Panko-breaded chicken, tonkatsu sauce'),
  it(15, 'Sashimi Platter (12 pcs)',  649, u('1611143669185-af224c5e3252'), 'Chef selection of raw fish'),
  it(16, 'Matcha Ice Cream',          199, u('1567206563064-6f60f40a2b57'), 'Green tea ice cream'),
];

// =========================================================
// SWEETS & DESSERTS
// =========================================================
const SWEETS_ITEMS: MenuItem[] = [
  it(1,  'Chocolate Truffle Cake',    549, u('1578985545062-69928b1d9587'), 'Dense chocolate sponge, ganache'),
  it(2,  'Red Velvet Cake',           499, u('1586788680434-30d324b2d46f'), 'Cream cheese frosting'),
  it(3,  'Black Forest Cake',         479, u('1606890737304-57a1ca8a5b62'), 'Cherries, cream, chocolate shavings'),
  it(4,  'Cheesecake (Slice)',        249, u('1533134242443-d4fd215305ad'), 'New York style baked cheesecake'),
  it(5,  'Brownie (Fudge)',           129, u('1606313564200-e75d5e30476c'), 'Warm, gooey chocolate brownie'),
  it(6,  'Chocolate Chip Cookie',      79, u('1499636136210-6f4ee915583e'), 'Chewy, loaded with chips'),
  it(7,  'Macarons (6 pcs)',          349, u('1569864358642-9d1684040f43'), 'Assorted French macarons'),
  it(8,  'Éclair',                    149, u('1612203985729-70726954388c'), 'Choux pastry, chocolate glaze'),
  it(9,  'Croissant',                 139, u('1555507036-ab1f4038808a'), 'Buttery, flaky, freshly baked'),
  it(10, 'Cinnamon Roll',             169, u('1509365465985-25d11c17e812'), 'Cream cheese icing'),
  it(11, 'Vanilla Ice Cream (2 scoops)',149, u('1567206563064-6f60f40a2b57'), 'Madagascar vanilla'),
  it(12, 'Belgian Chocolate Ice Cream',179, u('1563805042-7684c019e1cb'), 'Rich dark chocolate'),
  it(13, 'Gulab Jamun (4 pcs)',       149, u('1601303516572-5e3d5a05c1b1'), 'Milk dumplings in rose syrup'),
  it(14, 'Rasmalai (2 pcs)',          179, u('1601303516572-5e3d5a05c1b1'), 'Saffron milk, cardamom'),
  it(15, 'Jalebi (250g)',             199, u('1601303516572-5e3d5a05c1b1'), 'Crispy fried sweet in syrup'),
  it(16, 'Kaju Katli (250g)',         399, u('1601303516572-5e3d5a05c1b1'), 'Cashew fudge with silver leaf'),
];

// =========================================================
// MEAT & SEAFOOD
// =========================================================
const MEAT_SEAFOOD_ITEMS: MenuItem[] = [
  it(1,  'Chicken Breast (1 kg)',     349, u('1604503468506-a8da13d82791'), 'Skinless, boneless, fresh'),
  it(2,  'Chicken Curry Cut (1 kg)',  299, u('1587593810167-a84920ea0781'), 'Bone-in, curry cut pieces'),
  it(3,  'Chicken Wings (500g)',      249, u('1527474032487-5dcc87b3e9c6'), 'Whole wings, cleaned'),
  it(4,  'Mutton Curry Cut (1 kg)',   749, u('1602470520998-f4a52199a3d6'), 'Tender goat meat, bone-in'),
  it(5,  'Mutton Mince (500g)',       449, u('1602470520998-f4a52199a3d6'), 'Freshly minced keema'),
  it(6,  'Pork Belly (1 kg)',         649, u('1432139555190-58524dae6a55'), 'Skin-on, ideal for slow cooking'),
  it(7,  'Pork Sausages (500g)',      399, u('1587536742867-9ed4f7f7b0e3'), 'Herb-seasoned, casings intact'),
  it(8,  'Bacon Slices (250g)',       349, u('1524430521810-8e140fcdad9d'), 'Smoked, thinly sliced'),
  it(9,  'Beef Steak (500g)',         699, u('1588168333986-5078d3ae3976'), 'Sirloin, 1-inch cut'),
  it(10, 'Beef Mince (500g)',         449, u('1588347818481-c7c1b6b7f5b4'), 'Lean, freshly ground'),
  it(11, 'Salmon Fillet (500g)',      899, u('1519708227418-c8fd9a32b7a2'), 'Norwegian, skin-on'),
  it(12, 'Prawns (500g)',             549, u('1565680018434-b513d5e20873'), 'Medium, cleaned and deveined'),
  it(13, 'Rohu Fish (1 kg)',          249, u('1535140728325-a4d3707eee61'), 'Freshwater, cleaned'),
  it(14, 'Pomfret (500g)',            599, u('1615141982883-c7ad0e69fd62'), 'Whole, cleaned'),
  it(15, 'Squid (500g)',              399, u('1599084993091-1cb5c0721cc6'), 'Cleaned rings and tentacles'),
  it(16, 'Crab (500g)',               649, u('1559737558-2f5a35f4523b'), 'Live mud crab, cleaned'),
];

// =========================================================
// EVENTS & FLOWERS
// =========================================================
const EVENTS_FLOWERS_ITEMS: MenuItem[] = [
  it(1,  'Red Rose Bouquet (12)',     599, u('1518895949257-7621c3c786d7'), 'Fresh long-stem red roses'),
  it(2,  'Mixed Seasonal Bouquet',    799, u('1490750967868-88aa4486c946'), 'Assorted fresh flowers'),
  it(3,  'White Lily Bouquet',        649, u('1519744792095-2f2205e87b6f'), 'Fragrant Oriental lilies'),
  it(4,  'Sunflower Bunch (10)',      499, u('1597840126778-3ba5b6b3b2b9'), 'Cheerful sunflowers'),
  it(5,  'Orchid Potted Plant',       899, u('1567747349-b0e42e7f0c1b'), 'Phalaenopsis in ceramic pot'),
  it(6,  'Succulent Planter',         349, u('1485955900006-10f4d324d411'), 'Assorted small succulents'),
  it(7,  'Wedding Centerpiece',      1499, u('1519225421980-715cb0215aed'), 'Custom floral arrangement'),
  it(8,  'Birthday Flower Basket',    999, u('1490750967868-88aa4486c946'), 'Mixed blooms in woven basket'),
  it(9,  'Sympathy Wreath',          1299, u('1519225421980-715cb0215aed'), 'White and green standing wreath'),
  it(10, 'Balloon Bouquet (12)',      499, u('1530103862676-de8c9debad1d'), 'Helium-filled assorted colors'),
  it(11, 'Catering – Veg (per person)',449, u('1555244162-803834f70033'), 'Assorted veg mains, sides, dessert'),
  it(12, 'Catering – Non-Veg (per person)',599, u('1555939594-58d7cb561ad1'), 'Chicken, mutton, sides, dessert'),
  it(13, 'Chafing Dish Rental',       349, u('1556910103-1c02745aae4d'), 'Per dish, includes fuel'),
  it(14, 'Fairy Lights (10m)',        299, u('1519225421980-715cb0215aed'), 'Warm white LED string'),
  it(15, 'Table Centerpiece Set',     799, u('1464366400600-7168b8af9bc3'), 'Set of 4, candles included'),
  it(16, 'Event Photography (1 hr)', 2999, u('1519741497674-611481863552'), 'Digital album, 50+ edited photos'),
];

// =========================================================
// CLOTHING & JEWELRY
// =========================================================
const CLOTHING_ITEMS: MenuItem[] = [
  it(1,  'Cotton Crew T-Shirt',       799, u('1521572163474-6864f9cf17ab'), 'Unisex, multiple colors'),
  it(2,  'Slim-Fit Denim Jeans',     1899, u('1542272604-787c3835535d'), 'Stretch denim, mid-rise'),
  it(3,  'Casual Button-Down Shirt', 1499, u('1596755094514-f87e34085b2c'), 'Cotton, regular fit'),
  it(4,  'Floral Summer Dress',      2199, u('1595777457583-95e059d581b8'), 'Midi length, breathable'),
  it(5,  'Hooded Sweatshirt',        1699, u('1556821840-3a63f95609a7'), 'Fleece-lined, unisex'),
  it(6,  'Leather Biker Jacket',     5999, u('1551028719-00167b16eac5'), 'Genuine leather, zip front'),
  it(7,  'Kurta Set (Men)',          2499, u('1610180318691-1e67dbfad3dd'), 'Cotton blend, festive'),
  it(8,  'Saree (Silk Blend)',       3499, u('1610030469983-98e550d6193c'), 'Traditional, with blouse piece'),
  it(9,  'Formal Blazer',            4499, u('1594938298603-c8148c4dae35'), 'Wool blend, single-breasted'),
  it(10, 'Running Sneakers',         3299, u('1542291026-7eec264c27ff'), 'Cushioned, breathable mesh'),
  it(11, 'Leather Wallet',            899, u('1627123424574-724758594e93'), 'Bifold, RFID-blocking'),
  it(12, 'Silver Chain Necklace',    2499, u('1599643478518-a784e5dc4c8f'), '925 sterling silver, 20"'),
  it(13, 'Gold-Plated Earrings',     1899, u('1535632066927-ab7c9ab60908'), 'Pair, anti-tarnish finish'),
  it(14, 'Diamond Solitaire Ring',  29999, u('1605100804763-247f67b3557e'), '18k gold, VS clarity'),
  it(15, 'Pearl Bracelet',           1299, u('1611591437281-460bfbe1220a'), 'Freshwater pearls, adjustable'),
  it(16, 'Designer Sunglasses',      2499, u('1572635196237-14b3f281503f'), 'UV400, unisex frame'),
];

// =========================================================
// HOME & FURNITURE
// =========================================================
const HOME_FURNITURE_ITEMS: MenuItem[] = [
  it(1,  '3-Seater Fabric Sofa',    24999, u('1555041469-a586c61ea9bc'), 'Linen upholstery, wooden legs'),
  it(2,  'Accent Armchair',          8999, u('1567538096630-e0c55bd6374c'), 'Velvet, mid-century modern'),
  it(3,  'Queen-Size Bed Frame',    18999, u('1505693416388-ac5ce068fe85'), 'Solid wood, platform style'),
  it(4,  'Memory Foam Mattress',    12999, u('1631049307264-da0ec9d70304'), 'Queen, medium-firm, 8 inch'),
  it(5,  '6-Seater Dining Table',   19999, u('1617806118233-18e1de247200'), 'Solid oak, extends to 8-seater'),
  it(6,  'Dining Chair (Set of 2)',  5999, u('1503602642458-232111445657'), 'Upholstered, wooden legs'),
  it(7,  'Coffee Table',             4999, u('1533090481720-856c6e3c1fdc'), 'Marble top, brass base'),
  it(8,  'Bookshelf (5-tier)',       6999, u('1594026112284-02bb6f3352fe'), 'Engineered wood, wall-anchored'),
  it(9,  'Wardrobe (3-door)',       21999, u('1595428774223-ef52624120d2'), 'With mirror, internal drawers'),
  it(10, 'Study Desk',               6999, u('1518455027359-f3f8164ba6bd'), 'Wooden, with cable management'),
  it(11, 'Floor Lamp',               2999, u('1507473885765-e6ed057f782c'), 'Adjustable, fabric shade'),
  it(12, 'Ceiling Fan',              3999, u('1592965706256-e6b9d0c1c1c1'), '3-blade, remote control'),
  it(13, 'Area Rug (5x7 ft)',        4999, u('1600166898405-da9535204843'), 'Hand-woven, geometric'),
  it(14, 'Cushion Covers (Set of 4)', 999, u('1584100936595-c0654b55a2e2'), 'Cotton, 16x16 inches'),
  it(15, 'Wall Mirror',              2499, u('1618221195710-dd6b41faaea6'), 'Round, brass frame'),
  it(16, 'Ceramic Vase Set',         1799, u('1578500494198-246f612d3b3d'), 'Set of 3, matte finish'),
];

// =========================================================
// ELECTRONICS
// =========================================================
const ELECTRONICS_ITEMS: MenuItem[] = [
  it(1,  'Wireless Earbuds',         2999, u('1590658268037-6bf12165a8df'), 'BT 5.3, 24h battery, ANC'),
  it(2,  'Over-Ear Headphones',      4999, u('1505740420928-5e560c06d30e'), 'Noise cancelling, 40h battery'),
  it(3,  'Bluetooth Speaker',        2499, u('1608043152269-423dbba4e7e1'), 'IPX7 waterproof, 12h playtime'),
  it(4,  'Smart Watch',              8999, u('1523275335684-37898b6baf30'), 'AMOLED, GPS, heart-rate'),
  it(5,  'Fitness Band',             2499, u('1576243345690-4e4b79b63288'), 'Step count, sleep tracking'),
  it(6,  'Power Bank 20000mAh',      1999, u('1609091839311-d5365f9ff1c5'), 'Fast charge, dual USB'),
  it(7,  'USB-C Cable (2m)',          399, u('1583864697784-a0efc8379f70'), 'Braided, 100W capable'),
  it(8,  'Wireless Charger',          999, u('1592212512627-0844a7e5ac58'), '15W Qi, anti-slip base'),
  it(9,  'Mechanical Keyboard',      4999, u('1587829741301-dc798b83add3'), 'RGB, hot-swappable switches'),
  it(10, 'Wireless Mouse',           1499, u('1527864550417-7fd91fc51a46'), 'Ergonomic, 1600 DPI'),
  it(11, 'Webcam 1080p',             2499, u('1587829741301-dc798b83add3'), 'Auto-focus, built-in mic'),
  it(12, 'Ring Light 10"',           1799, u('1598550476439-6847785fcea6'), 'Dimmable, tripod included'),
  it(13, 'Smart LED Bulb (Pack of 2)',1199, u('1550985616-10810253b84d'), '16M colors, app controlled'),
  it(14, 'Action Camera',           12999, u('1526170375885-4d8ecf77b99f'), '4K60, waterproof case'),
  it(15, 'Drone with Camera',       24999, u('1473968512647-3e447244af8f'), '1080p, 25 min flight time'),
  it(16, 'VR Headset',              19999, u('1626379770675-8f5b6b5bfd3e'), 'Standalone, 4K display'),
];

// =========================================================
// BOOKS & OFFICE
// =========================================================
const BOOKS_OFFICE_ITEMS: MenuItem[] = [
  it(1,  'Notebook A5 (Ruled)',        149, u('1531346878377-a5be20888e57'), '200 pages, hardcover'),
  it(2,  'Fountain Pen',               499, u('1583485088034-697b5bc54ccd'), 'Medium nib, refillable'),
  it(3,  'Gel Pen Set (10 pcs)',       199, u('1583485088034-697b5bc54ccd'), 'Assorted colors, 0.5mm'),
  it(4,  'Highlighter Set (6 pcs)',    249, u('1583485088034-697b5bc54ccd'), 'Pastel and neon shades'),
  it(5,  'Sticky Notes (Pack of 5)',   129, u('1531346878377-a5be20888e57'), 'Assorted colors, 3x3 inch'),
  it(6,  'Desk Organizer',             899, u('1544716278-ca5e3f4abd8c'), 'Multi-compartment, wooden'),
  it(7,  'File Folder (Pack of 10)',   349, u('1568667256549-094345857637'), 'A4 size, plastic'),
  it(8,  'Stapler + Staples',          399, u('1587829741301-dc798b83add3'), 'Full-strip, includes 1000 staples'),
  it(9,  'Scissors',                   199, u('1587829741301-dc798b83add3'), 'Stainless steel, 8 inch'),
  it(10, 'Whiteboard 2x3 ft',         1499, u('1587829741301-dc798b83add3'), 'Magnetic, with marker tray'),
  it(11, 'Novel – Best Seller',        399, u('1544947950-fa07a98d237f'), 'Assorted titles'),
  it(12, 'Non-Fiction Bestseller',     499, u('1512820790803-83ca734da794'), 'Assorted titles'),
  it(13, 'Children\'s Picture Book',   299, u('1503676260728-1c00da094a0b'), 'Ages 3-7, hardcover'),
  it(14, 'Cookbook – Indian',          799, u('1556910103-1c02745aae4d'), 'Regional recipes, illustrated'),
  it(15, 'Planner 2026',               599, u('1506784983877-45594efa4cbe'), 'Weekly, A5 size'),
  it(16, 'Kindle Paperwhite',         12999, u('1592496431122-2349e0fbc666'), '6.8", 16GB, waterproof'),
];

// =========================================================
// HEALTH & BEAUTY
// =========================================================
const HEALTH_BEAUTY_ITEMS: MenuItem[] = [
  it(1,  'Vitamin C Serum',            999, u('1620916566398-39f1143ab7be'), '20% concentration, 30ml'),
  it(2,  'Moisturizer SPF 30',         799, u('1556228720-195a672e8a03'), 'Daily use, 50ml'),
  it(3,  'Face Wash (Foaming)',        499, u('1556228720-195a672e8a03'), 'Gentle, for all skin types'),
  it(4,  'Sunscreen SPF 50',           699, u('1556228720-195a672e8a03'), 'Broad spectrum, water resistant'),
  it(5,  'Lip Balm (Pack of 3)',       299, u('1591011932075-a7dc32d4b2ea'), 'Shea butter, tinted'),
  it(6,  'Body Lotion',                599, u('1556228720-195a672e8a03'), 'Coconut oil base, 400ml'),
  it(7,  'Hair Shampoo',               499, u('1585232004423-244e0e6904e3'), 'Sulfate-free, 300ml'),
  it(8,  'Conditioner',                499, u('1585232004423-244e0e6904e3'), 'Argan oil, 300ml'),
  it(9,  'Hair Oil',                   399, u('1585232004423-244e0e6904e3'), 'Coconut + almond, 200ml'),
  it(10, 'Perfume (Eau de Parfum)',   2499, u('1541643600914-78b084683601'), '50ml, long-lasting'),
  it(11, 'Lipstick',                   799, u('1586495777744-4413f21062fa'), 'Matte finish, assorted shades'),
  it(12, 'Kajal / Eyeliner',           299, u('1583241800698-e8ab01c6b1e1'), 'Smudge-proof, 0.35g'),
  it(13, 'Foundation',                1199, u('1631730359585-38a4935cbec4'), 'Medium coverage, 30ml'),
  it(14, 'Nail Polish (Set of 3)',     499, u('1610992015732-2449b76344bc'), 'Glossy finish, quick-dry'),
  it(15, 'Multivitamin (60 tabs)',     699, u('1587854692152-cbe660dbde88'), 'Daily, men & women'),
  it(16, 'Digital Thermometer',        399, u('1584362917165-526a968579e8'), 'Fast read, 10 sec'),
];

// =========================================================
// SPORTS & GARDEN
// =========================================================
const SPORTS_GARDEN_ITEMS: MenuItem[] = [
  it(1,  'Yoga Mat (6mm)',            1299, u('1591291621164-2c6367723315'), 'Non-slip, with carry strap'),
  it(2,  'Dumbbell Set (2 x 5kg)',    2499, u('1517836357463-d25dfeac3438'), 'Rubber coated, chrome handles'),
  it(3,  'Resistance Bands Set',       799, u('1598289431512-b97b0917affc'), '5 levels, with door anchor'),
  it(4,  'Skipping Rope',              399, u('1598289431512-b97b0917affc'), 'Adjustable, ball-bearing'),
  it(5,  'Cricket Bat (Kashmir Willow)',2499, u('1531415074968-036ba1b575da'), 'Full size, with grip'),
  it(6,  'Football (Size 5)',          899, u('1614632537190-23e4146777db'), 'Machine-stitched, PVC'),
  it(7,  'Basketball',                1199, u('1546519638-68e109498ffc'), 'Size 7, indoor/outdoor'),
  it(8,  'Badminton Racket Pair',     1499, u('1626224583764-f87db24ac4ea'), 'With 3 shuttlecocks'),
  it(9,  'Table Tennis Set',          1299, u('1611251135232-8f5c7c5f8b8c'), '2 paddles, 3 balls, net'),
  it(10, 'Cycling Helmet',            1799, u('1558618666-fcd25c85cd64'), 'Ventilated, adjustable'),
  it(11, 'Garden Trowel Set',          499, u('1416879595882-3373a0480b5b'), '3-piece, stainless steel'),
  it(12, 'Watering Can (5L)',          799, u('1416879595882-3373a0480b5b'), 'Galvanized, long spout'),
  it(13, 'Pruning Shears',             599, u('1416879595882-3373a0480b5b'), 'Bypass, ergonomic grip'),
  it(14, 'Potting Soil (10L)',         349, u('1416879595882-3373a0480b5b'), 'Organic, ready to use'),
  it(15, 'Seed Starter Kit',           699, u('1416879595882-3373a0480b5b'), '20 peat pots + seeds'),
  it(16, 'Garden Gloves (Pair)',       299, u('1416879595882-3373a0480b5b'), 'Latex-coated, breathable'),
];

// =========================================================
// AUTO PARTS
// =========================================================
const AUTO_PARTS_ITEMS: MenuItem[] = [
  it(1,  'Engine Oil 5W-30 (4L)',     2299, u('1632823393213-3c4e0a5b5a1a'), 'Fully synthetic, API SP'),
  it(2,  'Oil Filter',                 499, u('1486263248352-3c4c2f5c6c1f'), 'Universal fit, premium'),
  it(3,  'Air Filter',                 699, u('1486263248352-3c4c2f5c6c1f'), 'High-flow, washable'),
  it(4,  'Brake Pads (Front Pair)',   2499, u('1486263248352-3c4c2f5c6c1f'), 'Ceramic, low-dust'),
  it(5,  'Brake Disc (Single)',       1899, u('1486263248352-3c4c2f5c6c1f'), 'Vented, anti-rust coating'),
  it(6,  'Car Battery 12V 45Ah',      5999, u('1609091839311-d5365f9ff1c5'), 'Maintenance-free, 2-yr warranty'),
  it(7,  'Spark Plug (Set of 4)',     1299, u('1486263248352-3c4c2f5c6c1f'), 'Iridium tip, long life'),
  it(8,  'Wiper Blades (Pair)',        899, u('1486263248352-3c4c2f5c6c1f'), 'Beam style, all-weather'),
  it(9,  'Headlight Bulb (Pair)',      999, u('1486263248352-3c4c2f5c6c1f'), 'LED, 6000K cool white'),
  it(10, 'Car Phone Mount',            599, u('1486263248352-3c4c2f5c6c1f'), 'Magnetic, 360° rotation'),
  it(11, 'Dash Cam 1080p',            3999, u('1587829741301-dc798b83add3'), 'Loop recording, night vision'),
  it(12, 'Tire Inflator (Portable)',  1999, u('1609091839311-d5365f9ff1c5'), 'Digital gauge, auto shut-off'),
  it(13, 'Jump Starter Power Bank',   4999, u('1609091839311-d5365f9ff1c5'), '12000mAh, with clamps'),
  it(14, 'Car Vacuum (Handheld)',     1799, u('1609091839311-d5365f9ff1c5'), '12V, HEPA filter'),
  it(15, 'Microfiber Cloth (Pack of 6)', 349, u('1486263248352-3c4c2f5c6c1f'), 'Lint-free, scratch-safe'),
  it(16, 'Car Freshener (Pack of 3)',  299, u('1486263248352-3c4c2f5c6c1f'), 'Long-lasting, assorted scents'),
];

// =========================================================
// OTHER SHOPS
// =========================================================
const OTHER_SHOPS_ITEMS: MenuItem[] = [
  it(1,  'Pet Food – Dog (3kg)',      1299, u('1589924691995-400dc9ecc119'), 'Chicken & rice, adult'),
  it(2,  'Pet Food – Cat (1.5kg)',     999, u('1589924691995-400dc9ecc119'), 'Ocean fish, adult'),
  it(3,  'Dog Leash',                  499, u('1601758228041-f3b2795255f1'), 'Nylon, reflective, 1.5m'),
  it(4,  'Cat Toy – Feather Wand',     299, u('1595234343306-6f1b8f1f5f8f'), 'Interactive, natural feathers'),
  it(5,  'Pet Bed (Medium)',          1499, u('1601758228041-f3b2795255f1'), 'Washable cover, non-slip base'),
  it(6,  'Aquarium Fish Tank (20L)',  3499, u('1522064165672-8c1b5b8e0b8f'), 'With filter and LED'),
  it(7,  'Toy Building Blocks (500 pcs)',1499, u('1587654780291-39c9404d746b'), 'Ages 5+, compatible with major brands'),
  it(8,  'Remote Control Car',        1999, u('1594736797933-d0501ba2fe65'), '1:16 scale, 2.4GHz'),
  it(9,  'Board Game – Strategy',     1299, u('1606503154546-6f4c4a3c0b5f'), '2-6 players, ages 10+'),
  it(10, 'Puzzle – 1000 pieces',       699, u('1606503154546-6f4c4a3c0b5f'), 'Landscape, premium print'),
  it(11, 'Hammer (Claw)',              599, u('1581244277943-fe4a9c777189'), 'Steel head, rubber grip'),
  it(12, 'Screwdriver Set (12 pcs)',   899, u('1581244277943-fe4a9c777189'), 'Magnetic tips, case included'),
  it(13, 'Measuring Tape (5m)',        299, u('1581244277943-fe4a9c777189'), 'Auto-lock, belt clip'),
  it(14, 'Paint Roller Set',           499, u('1581244277943-fe4a9c777189'), 'Includes tray and brush'),
  it(15, 'Whiskey (750ml)',           2499, u('1527285783387-6c1c3f2c3d3c'), 'Single malt, aged 12 years'),
  it(16, 'Wine (Red, 750ml)',          999, u('1510812431401-41d2bd2722f3'), 'Cabernet Sauvignon, reserve'),
];

// =========================================================
// MAP: category - { bannerUrl, items }
// =========================================================
export const CATEGORY_DEFAULTS: Record<StoreCategory, CategoryDefaults> = {
  'restaurant': {
    bannerUrl:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80&auto=format&fit=crop',
    items: RESTAURANT_ITEMS,
  },
  'drinks-cafe': {
    bannerUrl:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1600&q=80&auto=format&fit=crop',
    items: DRINKS_ITEMS,
  },
  'fast-food': {
    bannerUrl:
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1600&q=80&auto=format&fit=crop',
    items: FAST_FOOD_ITEMS,
  },
  'specialty-food': {
    bannerUrl:
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1600&q=80&auto=format&fit=crop',
    items: SPECIALTY_ITEMS,
  },
  'sweets-desserts': {
    bannerUrl:
      'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=1600&q=80&auto=format&fit=crop',
    items: SWEETS_ITEMS,
  },
  'meat-seafood': {
    bannerUrl:
      'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=1600&q=80&auto=format&fit=crop',
    items: MEAT_SEAFOOD_ITEMS,
  },
  'events-flowers': {
    bannerUrl:
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1600&q=80&auto=format&fit=crop',
    items: EVENTS_FLOWERS_ITEMS,
  },
  'clothing-jewelry': {
    bannerUrl:
      'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1600&q=80&auto=format&fit=crop',
    items: CLOTHING_ITEMS,
  },
  'home-furniture': {
    bannerUrl:
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&q=80&auto=format&fit=crop',
    items: HOME_FURNITURE_ITEMS,
  },
  'electronics': {
    bannerUrl:
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1600&q=80&auto=format&fit=crop',
    items: ELECTRONICS_ITEMS,
  },
  'books-office': {
    bannerUrl:
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1600&q=80&auto=format&fit=crop',
    items: BOOKS_OFFICE_ITEMS,
  },
  'health-beauty': {
    bannerUrl:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1600&q=80&auto=format&fit=crop',
    items: HEALTH_BEAUTY_ITEMS,
  },
  'sports-garden': {
    bannerUrl:
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&q=80&auto=format&fit=crop',
    items: SPORTS_GARDEN_ITEMS,
  },
  'auto-parts': {
    bannerUrl:
      'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1600&q=80&auto=format&fit=crop',
    items: AUTO_PARTS_ITEMS,
  },
  'other-shops': {
    bannerUrl:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80&auto=format&fit=crop',
    items: OTHER_SHOPS_ITEMS,
  },
};

/** Get the default config for a store category. Falls back to restaurant. */
export const getCategoryDefaults = (
  category: StoreCategory | undefined,
): CategoryDefaults =>
  CATEGORY_DEFAULTS[category ?? 'restaurant'] ?? CATEGORY_DEFAULTS.restaurant;