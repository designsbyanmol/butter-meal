// src/data/storeDefaults/foodBeverage.ts
import { it, u, type CategoryDefaults } from './types';

const FOOD_BEVERAGE_ITEMS = [
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

export const FOOD_BEVERAGE_DEFAULTS: CategoryDefaults = {
  bannerUrl:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80&auto=format&fit=crop',
  items: FOOD_BEVERAGE_ITEMS,
};