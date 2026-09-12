import { MenuItem } from '../types';

export const menuItems: MenuItem[] = [
  {
    id: 1,
    inStock: true,
    name: "Anmol Vegetable Idli (4 mini idli) Combo With Peanut Chutney & Sambar",
    desc: "Freshly steamed soft vegetable idlis served with creamy roasted peanut chutney and flavorful South Indian sambar. A light, healthy, and satisfying meal packed with authentic taste, aromatic spices, and wholesome ingredients. Perfect for breakfast, lunch, or evening cravings with a delicious homemade touch.",
    costPrice: 80,
    price: 50,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/idliSambhar.webp",
    category: "South Indian",
    isVeg: true,
    isSpicy: true,
    isGlutenFree: false,
    preparationTime: "15-20min",
    calories: 432,
    rating: 4.6,
    reviewCount: 11,
    ingredients: [
      "Suji",
      "Dahi",
      "Baking Soda",
      "Salt",
      "RO Water",
      "Toor Dal",
      "Mix Vegetables",
      "Tamarind",
      "Sambhar Masala",
      "Turmeric Powder",
      "Red Chili Powder",
      "Salt",
      "Hing",
      "Curry leaves",
      "Peanuts",
      "Mustard Oil"
    ],
    nutritionalInfo: {
      protein: "13",
      carbs: "110",
      fat: "18",
      fiber: "12"
    },
    attributes: {
      isPopular: false,
      isNew: false,
      isChefSpecial: false,
      isLimited: true
    },
    customizationOptions: [
      {
        name: "Beverages",
        choices: [
    { name: "No Water", price: 0 },
    { name: "500ml Water Bottle", price: 10 }
  ],
        default: "No Water"
      },
      {
        name: "Quantity",
        choices: [
    { name: "No Water", price: 0 },
    { name: "500ml Water Bottle", price: 10 }
  ],
        default: "4 Idli"
      }
    ]
  },
  {
    id: 2,
    inStock: true,
    name: "Anmol Dahi Vada",
    desc: "Soft lentil dumplings soaked in creamy chilled yogurt, topped with fresh dhaniya chutney and sweet-tangy imli chutney. Garnished with roasted cumin, chili powder, and a hint of chaat masala for an authentic Indian street-style flavor. A refreshing, rich, and perfectly balanced snack loved across India.",
    costPrice: 65,
    price: 50,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/dahiVada.webp",
    category: "Dahi Special",
    isVeg: true,
    isSpicy: true,
    isGlutenFree: false,
    preparationTime: "5-10mins",
    calories: 73,
    rating: 5,
    reviewCount: 14,
    ingredients: [
      "Urad Dal",
      "Dahi",
      "Sugar",
      "Salt",
      "Red Chilli Dried",
      "Green Chilli",
      "Kismis",
      "Soyabeen Vegetable oil",
      "Tamarind"
    ],
    nutritionalInfo: {
      protein: "2.5",
      carbs: "7.2",
      fat: "3.8",
      fiber: "1.3"
    },
    attributes: {
      isPopular: false,
      isNew: false,
      isChefSpecial: true,
      isLimited: true
    },
    customizationOptions: [
      {
        name: "Beverages",
        choices: [
    { name: "No Water", price: 0 },
    { name: "500ml Water Bottle", price: 10 }
  ],
        default: "No Water"
      },
      {
        name: "Quantity",
        choices: [
    { name: "No Water", price: 0 },
    { name: "500ml Water Bottle", price: 10 }
  ],
        default: "One"
      }
    ]
  },
  {
    id: 3,
    inStock: true,
    name: "Fried Idli Bites With Green Dhaniya Chutney",
    desc: "Soft idlis pan-fried until crispy and tossed in flavorful South Indian spices, served with fresh homemade dhaniya chutney. A perfect crunchy, spicy, and authentic snack for breakfast or evening cravings.",
    costPrice: 80,
    price: 65,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/friedIdli.webp",
    category: "South Indian",
    isVeg: true,
    isSpicy: true,
    isGlutenFree: false,
    preparationTime: "10-15mins",
    calories: 108,
    rating: 4.8,
    reviewCount: 13,
    ingredients: [
      "Suji",
      "Oil",
      "Salt",
      "Chaat Masala",
      "Red Chili Powder",
      "Pav Bhaji Masala"
    ],
    nutritionalInfo: {
      protein: "3.8",
      carbs: "15.2",
      fat: "3.2",
      fiber: "3"
    },
    attributes: {
      isPopular: true,
      isNew: false,
      isChefSpecial: false,
      isLimited: false
    },
    customizationOptions: [
      {
        name: "Beverages",
        choices: [
    { name: "No Water", price: 0 },
    { name: "500ml Water Bottle", price: 10 }
  ],
        default: "No Water"
      },
      {
        name: "Quantity",
        choices: [
    { name: "No Water", price: 0 },
    { name: "500ml Water Bottle", price: 10 }
  ],
        default: "Half"
      }
    ]
  },
  {
    id: 4,
    inStock: true,
    name: "Sambhar Vada",
    desc: "Crispy golden Medu Vada made with traditional South Indian spices, soft from inside and perfectly fried for authentic flavor. Served with freshly prepared creamy peanut chutney, blended with roasted peanuts, curry leaves, and mild spices. A delicious, comforting snack or breakfast option delivered fresh and full of homemade taste.",
    costPrice: 60,
    price: 45,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/sambharVada.webp",
    category: "South Indian",
    isVeg: true,
    isSpicy: true,
    isGlutenFree: false,
    preparationTime: "5-10mins",
    calories: 126,
    rating: 4.7,
    reviewCount: 16,
    ingredients: [],
    nutritionalInfo: {
      protein: "3.6",
      carbs: "8.4",
      fat: "8.5",
      fiber: "2.5"
    },
    attributes: {
      isPopular: false,
      isNew: false,
      isChefSpecial: false,
      isLimited: true
    },
    customizationOptions: [
      {
        name: "Beverages",
        choices: [
    { name: "No Water", price: 0 },
    { name: "500ml Water Bottle", price: 10 }
  ],
        default: "No Water"
      },
      {
        name: "Quantity",
        choices: [
    { name: "No Water", price: 0 },
    { name: "500ml Water Bottle", price: 10 }
  ],
        default: "One"
      }
    ]
  },
];