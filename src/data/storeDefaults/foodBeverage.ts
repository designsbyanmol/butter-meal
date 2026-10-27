// src/data/storeDefaults/foodBeverage.ts
import { it, u, type CategoryDefaults } from './types';

const FOOD_BEVERAGE_ITEMS = [
  // ============================================================
  // From legacy menuData.ts (real items, mapped to CDN images)
  // ============================================================
  it(
    1,
    'Anmol Vegetable Idli (4 mini idli) Combo With Peanut Chutney & Sambar',
    50,
    u('cooking.webp'),
    'Freshly steamed soft vegetable idlis served with creamy roasted peanut chutney and flavorful South Indian sambar. A light, healthy, and satisfying meal packed with authentic taste, aromatic spices, and wholesome ingredients. Perfect for breakfast, lunch, or evening cravings with a delicious homemade touch.',
    {
      isVeg: true,
      isSpicy: true,
      costPrice: 80,
      category: 'South Indian',
      preparationTime: '15-20 min',
      calories: 432,
      ingredients: [
        'Suji',
        'Dahi',
        'Baking Soda',
        'Salt',
        'RO Water',
        'Toor Dal',
        'Mix Vegetables',
        'Tamarind',
        'Sambhar Masala',
        'Turmeric Powder',
        'Red Chili Powder',
        'Hing',
        'Curry leaves',
        'Peanuts',
        'Mustard Oil',
      ],
      nutritionalInfo: {
        protein: '13',
        carbs: '110',
        fat: '18',
        fiber: '12',
      },
      attributes: { isLimited: true },
      customizationOptions: [
        {
          name: 'Beverages',
          choices: [
            { name: 'No Water', price: 0 },
            { name: '500ml Water Bottle', price: 10 },
          ],
          default: 'No Water',
        },
        {
          name: 'Quantity',
          choices: [
            { name: '4 Idli', price: 0 },
            { name: '6 Idli', price: 30 },
          ],
          default: '4 Idli',
        },
      ],
    },
  ),
  it(
    2,
    'Anmol Dahi Vada',
    50,
    u('table-nonveg.webp'),
    'Soft lentil dumplings soaked in creamy chilled yogurt, topped with fresh dhaniya chutney and sweet-tangy imli chutney. Garnished with roasted cumin, chili powder, and a hint of chaat masala for an authentic Indian street-style flavor. A refreshing, rich, and perfectly balanced snack loved across India.',
    {
      isVeg: true,
      isSpicy: true,
      costPrice: 65,
      category: 'Dahi Special',
      preparationTime: '5-10 min',
      calories: 73,
      ingredients: [
        'Urad Dal',
        'Dahi',
        'Sugar',
        'Salt',
        'Red Chilli Dried',
        'Green Chilli',
        'Kismis',
        'Soyabeen Vegetable oil',
        'Tamarind',
      ],
      nutritionalInfo: {
        protein: '2.5',
        carbs: '7.2',
        fat: '3.8',
        fiber: '1.3',
      },
      attributes: { isChefSpecial: true, isLimited: true },
      customizationOptions: [
        {
          name: 'Beverages',
          choices: [
            { name: 'No Water', price: 0 },
            { name: '500ml Water Bottle', price: 10 },
          ],
          default: 'No Water',
        },
        {
          name: 'Quantity',
          choices: [
            { name: 'One', price: 0 },
            { name: 'Two', price: 45 },
          ],
          default: 'One',
        },
      ],
    },
  ),
  it(
    3,
    'Fried Idli Bites With Green Dhaniya Chutney',
    65,
    u('cooking.webp'),
    'Soft idlis pan-fried until crispy and tossed in flavorful South Indian spices, served with fresh homemade dhaniya chutney. A perfect crunchy, spicy, and authentic snack for breakfast or evening cravings.',
    {
      isVeg: true,
      isSpicy: true,
      costPrice: 80,
      category: 'South Indian',
      preparationTime: '10-15 min',
      calories: 108,
      ingredients: [
        'Suji',
        'Oil',
        'Salt',
        'Chaat Masala',
        'Red Chili Powder',
        'Pav Bhaji Masala',
      ],
      nutritionalInfo: {
        protein: '3.8',
        carbs: '15.2',
        fat: '3.2',
        fiber: '3',
      },
      attributes: { isPopular: true },
      customizationOptions: [
        {
          name: 'Beverages',
          choices: [
            { name: 'No Water', price: 0 },
            { name: '500ml Water Bottle', price: 10 },
          ],
          default: 'No Water',
        },
        {
          name: 'Quantity',
          choices: [
            { name: 'Half', price: 0 },
            { name: 'Full', price: 30 },
          ],
          default: 'Half',
        },
      ],
    },
  ),
  it(
    4,
    'Sambhar Vada',
    45,
    u('cooking.webp'),
    'Crispy golden Medu Vada made with traditional South Indian spices, soft from inside and perfectly fried for authentic flavor. Served with freshly prepared creamy peanut chutney, blended with roasted peanuts, curry leaves, and mild spices. A delicious, comforting snack or breakfast option delivered fresh and full of homemade taste.',
    {
      isVeg: true,
      isSpicy: true,
      costPrice: 60,
      category: 'South Indian',
      preparationTime: '5-10 min',
      calories: 126,
      ingredients: [],
      nutritionalInfo: {
        protein: '3.6',
        carbs: '8.4',
        fat: '8.5',
        fiber: '2.5',
      },
      attributes: { isLimited: true },
      customizationOptions: [
        {
          name: 'Beverages',
          choices: [
            { name: 'No Water', price: 0 },
            { name: '500ml Water Bottle', price: 10 },
          ],
          default: 'No Water',
        },
        {
          name: 'Quantity',
          choices: [
            { name: 'One', price: 0 },
            { name: 'Two', price: 40 },
          ],
          default: 'One',
        },
      ],
    },
  ),
  it(
    5,
    'Fresh Bhindi Pyaz Sabji With 2 Parathas',
    80,
    u('cooking.webp'),
    'Delicious homemade bhindi pyaz sabji cooked with fresh okra, onions, and aromatic Indian spices, served with 2 soft and flaky parathas. A comforting and flavourful meal perfect for lunch or dinner, prepared fresh for authentic taste and satisfying hunger.',
    {
      isVeg: true,
      isSpicy: true,
      costPrice: 90,
      category: 'North Indian',
      preparationTime: '15-20 min',
      calories: 630,
      ingredients: [
        'Bhindi (Okra)',
        'Onion',
        'Cooking Oil',
        'Turmeric Powder',
        'Red Chili Powder',
        'Salt',
        'Coriander Powder',
        'Cumin Seeds',
        'Green Chilies',
        'Whole Wheat Flour',
        'Water',
        'Oil',
      ],
      nutritionalInfo: {
        protein: '13',
        carbs: '78',
        fat: '18',
        fiber: '10',
      },
      attributes: { isNew: true },
      customizationOptions: [
        {
          name: 'Beverages',
          choices: [
            { name: 'No Water', price: 0 },
            { name: '500ml Water Bottle', price: 10 },
          ],
          default: 'No Water',
        },
      ],
    },
  ),
  it(
    6,
    'Aloo Sandwich With Fresh Chutney',
    55,
    u('wrap.webp'),
    'Crispy grilled bread stuffed with a flavorful potato filling made with fresh herbs, onions, and Indian spices. Served hot with chutney and sauce, this delicious aloo sandwich is the perfect comfort snack for breakfast, evening cravings, or a quick meal. Freshly prepared, satisfying, and packed with homestyle taste in every bite.',
    {
      isVeg: true,
      costPrice: 75,
      category: 'Breakfast',
      preparationTime: '15-20 min',
      calories: 217,
      ingredients: [
        'Bread',
        'Potatoes',
        'Onion',
        'Green Chilies',
        'Coriander',
        'Ginger',
        'Salt',
        'Red Chili Powder',
        'Cumin Powder',
        'Butter/Ghee',
      ],
      nutritionalInfo: {
        protein: '4.6',
        carbs: '35.2',
        fat: '6.3',
        fiber: '1.8',
      },
      attributes: { isPopular: true },
      customizationOptions: [
        {
          name: 'Beverages',
          choices: [
            { name: 'No Water', price: 0 },
            { name: '500ml Water Bottle', price: 10 },
          ],
          default: 'No Water',
        },
        {
          name: 'Quantity',
          choices: [
            { name: 'One', price: 0 },
            { name: 'Two', price: 45 },
          ],
          default: 'One',
        },
      ],
    },
  ),
  it(
    7,
    'Desi Style Poha',
    60,
    u('cooking.webp'),
    'Fresh and flavourful Indian poha made with flattened rice, onions, green chilies, curry leaves, and mild spices, garnished with fresh coriander and lemon. Light, wholesome, and perfectly balanced in taste, this comforting breakfast dish is served hot for a delicious and satisfying meal, ideal for any time of the day.',
    {
      isVeg: true,
      costPrice: 70,
      category: 'Breakfast',
      preparationTime: '15-20 min',
      calories: 210,
      ingredients: [
        'Poha (Flattened Rice)',
        'Onion',
        'Potato',
        'Peanuts',
        'Mustard Seeds',
        'Curry Leaves',
        'Green Chilies',
        'Turmeric Powder',
        'Oil',
        'Salt',
        'Lemon Juice',
        'Coriander Leaves',
        'Sugar',
      ],
      nutritionalInfo: {
        protein: '44',
        carbs: '4.3',
        fat: '1.8',
        fiber: '2.7',
      },
      attributes: { isChefSpecial: true },
      customizationOptions: [
        {
          name: 'Quantity',
          choices: [
            { name: 'Half', price: 0 },
            { name: 'Full', price: 50 },
          ],
          default: 'Half',
        },
        {
          name: 'Peanuts',
          choices: [
            { name: 'Yes', price: 0 },
            { name: 'No', price: 0 },
          ],
          default: 'Yes',
        },
        {
          name: 'Namkeen',
          choices: [
            { name: 'Yes', price: 0 },
            { name: 'No', price: 0 },
          ],
          default: 'Yes',
        },
      ],
    },
  ),
  it(
    8,
    'Pyaz Pakodi With Dhaniya Chutney',
    35,
    u('cooking.webp'),
    'Crispy golden onion pakodis made with fresh onions, gram flour, and aromatic spices, deep-fried to perfection for an irresistible crunch. Served hot with refreshing dhaniya chutney prepared from fresh coriander, green chilies, and tangy flavors. A perfect tea-time snack packed with spicy, crunchy, and delicious street-style taste.',
    {
      isVeg: true,
      costPrice: 40,
      category: 'Breakfast',
      preparationTime: '10-15 min',
      calories: 310,
      ingredients: [
        'Onion',
        'Besan (Gram Flour)',
        'Rice Flour',
        'Salt',
        'Green Chilies',
        'Turmeric Powder',
        'Ginger-Garlic Paste',
        'Cumin Seeds',
        'Ajwain (Carom Seeds)',
        'Chaat Masala',
        'Coriander Leaves',
        'Oil for Frying',
      ],
      nutritionalInfo: {
        protein: '5.2',
        carbs: '34.5',
        fat: '19.7',
        fiber: '3.4',
      },
      attributes: { isNew: true },
      customizationOptions: [
        {
          name: 'Quantity',
          choices: [
            { name: 'Half', price: 0 },
            { name: 'Full', price: 30 },
          ],
          default: 'Half',
        },
        {
          name: 'Beverages',
          choices: [
            { name: 'No Water', price: 0 },
            { name: '500ml Water Bottle', price: 10 },
          ],
          default: 'No Water',
        },
      ],
    },
  ),
  it(
    9,
    'Fresh Paneer Paratha | High Protein Meal',
    65,
    u('cooking.webp'),
    'Enjoy our traditional Indian Buttery Paneer Paratha, stuffed with fresh spiced paneer and roasted to golden perfection with rich butter. Served with flavorful dhaniya chutney for the perfect desi taste. Soft, crispy, and satisfying - a comforting meal packed with authentic Indian flavors in every bite.',
    {
      isVeg: true,
      costPrice: 75,
      category: 'Breakfast',
      preparationTime: '15-20 min',
      calories: 249,
      ingredients: [
        'Paneer',
        'Salt',
        'Cumin Seeds',
        'Red Chili Powder',
        'Green Chilies',
        'Onion',
        'Dhaniya',
      ],
      nutritionalInfo: {
        protein: '9.8',
        carbs: '28.2',
        fat: '11.7',
        fiber: '4.3',
      },
      attributes: { isPopular: true, isChefSpecial: true },
      customizationOptions: [
        {
          name: 'Quantity',
          choices: [
            { name: 'One', price: 0 },
            { name: 'Two', price: 55 },
          ],
          default: 'One',
        },
        {
          name: 'Beverages',
          choices: [
            { name: 'No Water', price: 0 },
            { name: '500ml Water Bottle', price: 10 },
          ],
          default: 'No Water',
        },
      ],
    },
  ),
  it(
    10,
    'Stuffed Aloo Paratha | Desi Breakfast',
    50,
    u('cooking.webp'),
    'Traditional Indian buttery Aloo Paratha, stuffed with perfectly spiced mashed potatoes and cooked golden with rich butter for an authentic homemade taste. Served with fresh, flavorful dhaniya chutney that adds a refreshing zing to every bite. Soft inside, crispy outside - a comforting North Indian favorite, perfect for breakfast, lunch, or anytime cravings.',
    {
      isVeg: true,
      costPrice: 60,
      category: 'Breakfast',
      preparationTime: '10-15 min',
      calories: 290,
      ingredients: [
        'Whole Wheat Atta',
        'Amul Butter',
        'Desi Ghee',
        'Salt',
        'Chilli Power',
        'Dhaniya',
        'Green Chilli',
      ],
      nutritionalInfo: {
        protein: '6.5',
        carbs: '34',
        fat: '9',
        fiber: '4',
      },
      attributes: { isChefSpecial: true },
      customizationOptions: [
        {
          name: 'Quantity',
          choices: [
            { name: 'One', price: 0 },
            { name: 'Two', price: 45 },
          ],
          default: 'One',
        },
        {
          name: 'Beverages',
          choices: [
            { name: 'No Water', price: 0 },
            { name: '500ml Water Bottle', price: 10 },
          ],
          default: 'No Water',
        },
      ],
    },
  ),

  // ============================================================
  // Kept from the original storeDefaults foodBeverage.ts
  // ============================================================
  it(
    11,
    'Margherita Pizza (10")',
    299,
    u('pizza.webp'),
    'Tomato, mozzarella, fresh basil',
    {
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
    },
  ),
  it(
    12,
    'Classic Cheeseburger',
    249,
    u('burger.webp'),
    'Beef patty, cheddar, lettuce, tomato',
    {
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
    },
  ),
  it(
    13,
    'Butter Chicken',
    349,
    u('butter-chicken.webp'),
    'Creamy tomato gravy, tender chicken',
    {
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
    },
  ),
  it(
    14,
    'Paneer Butter Masala',
    299,
    u('butter-paneer-masala.webp'),
    'Rich, mild paneer curry',
    {
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
    },
  ),
  it(
    15,
    'Cappuccino',
    180,
    u('coffee.webp'),
    'Espresso with steamed milk foam',
    {
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
    },
  ),
  it(
    16,
    'Chocolate Truffle Cake (Slice)',
    249,
    u('cake.webp'),
    'Dense chocolate sponge, ganache',
    {
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
    },
  ),
];

export const FOOD_BEVERAGE_DEFAULTS: CategoryDefaults = {
  bannerUrl:
    'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/assets/dinin.webp',
  items: FOOD_BEVERAGE_ITEMS,
};