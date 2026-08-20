import { MenuItem } from '../types';

export const menuItems: MenuItem[] = [
  {
    id: 1,
    inStock: true,
    name: "Soft Vegetable Idli (4 mini idli) Combo With Peanut Chutney & Sambar",
    desc: "Freshly steamed soft vegetable idlis served with creamy roasted peanut chutney and flavorful South Indian sambar. A light, healthy, and satisfying meal packed with authentic taste, aromatic spices, and wholesome ingredients. Perfect for breakfast, lunch, or evening cravings with a delicious homemade touch.",
    costPrice: 80,
    price: 60,
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
        options: [
          "No Water",
          "500ml Water Bottle (+Rs10)"
        ],
        default: "No Water"
      },
      {
        name: "Quantity",
        options: [
          "4 Idli",
          "6 Idli (+Rs30)"
        ],
        default: "4 Idli"
      }
    ]
  },
  {
    id: 2,
    inStock: true,
    name: "Dahi Vada",
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
        options: [
          "No Water",
          "500ml Water Bottle(+Rs10)"
        ],
        default: "No Water"
      },
      {
        name: "Quantity",
        options: [
          "One",
          "Two (+Rs45)"
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
        options: [
          "No Water",
          "500ml Water Bottle(+Rs10)"
        ],
        default: "No Water"
      },
      {
        name: "Quantity",
        options: [
          "Half",
          "Full (+Rs30)"
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
        options: [
          "No Water",
          "500ml Water Bottle(+Rs10)"
        ],
        default: "No Water"
      },
      {
        name: "Quantity",
        options: [
          "One",
          "Two (+Rs40)"
        ],
        default: "One"
      }
    ]
  },
  {
    id: 5,
    inStock: true,
    name: "Fresh Bhindi Pyaz Sabji With 2 Parathas",
    desc: "Delicious homemade bhindi pyaz sabji cooked with fresh okra, onions, and aromatic Indian spices, served with 2 soft and flaky parathas. A comforting and flavourful meal perfect for lunch or dinner, prepared fresh for authentic taste and satisfying hunger.",
    costPrice: 90,
    price: 80,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/bhindiParatha.webp",
    category: "North Indian",
    isVeg: true,
    isSpicy: true,
    isGlutenFree: false,
    preparationTime: "15-20mins",
    calories: 630,
    rating: 4.9,
    reviewCount: 21,
    ingredients: [
      "Bhindi (Okra)",
      "Onion",
      "Cooking Oil",
      "Turmeric Powder",
      "Red Chili Powder",
      "Salt",
      "Coriander Powder",
      "Cumin Seeds",
      "Green Chilies",
      "Whole Wheat Flour",
      "Water",
      "Salt",
      "Oil"
    ],
    nutritionalInfo: {
      protein: "13",
      carbs: "78",
      fat: "18",
      fiber: "10"
    },
    attributes: {
      isPopular: false,
      isNew: true,
      isChefSpecial: false,
      isLimited: false
    },
    customizationOptions: [
      {
        name: "Beverages",
        options: [
          "No Water",
          "500ml Water Bottle(+Rs10)"
        ],
        default: "No Water"
      }
    ]
  },
  {
    id: 6,
    inStock: true,
    name: "Aloo Sandwich With Fresh Chutney",
    desc: "Crispy grilled bread stuffed with a flavorful potato filling made with fresh herbs, onions, and Indian spices. Served hot with chutney and sauce, this delicious aloo sandwich is the perfect comfort snack for breakfast, evening cravings, or a quick meal. Freshly prepared, satisfying, and packed with homestyle taste in every bite.",
    costPrice: 75,
    price: 55,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/sandwich.webp",
    category: "Breakfast",
    isVeg: true,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: "15-20min",
    calories: 217,
    rating: 4.6,
    reviewCount: 21,
    ingredients: [
      "Bread",
      "Potatoes",
      "Onion",
      "Green Chilies",
      "Coriander",
      "Ginger",
      "Salt",
      "Red Chili Powder",
      "Cumin Powder",
      "Butter/Ghee"
    ],
    nutritionalInfo: {
      protein: "4.6",
      carbs: "35.2",
      fat: "6.3",
      fiber: "1.8"
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
        options: [
          "No Water",
          "500ml Water Bottle (+Rs10)"
        ],
        default: "No Water"
      },
      {
        name: "Quantity",
        options: [
          "One",
          "Two(+Rs45)"
        ],
        default: "One"
      }
    ]
  },
  {
    id: 7,
    inStock: true,
    name: "Desi Style Poha",
    desc: "Fresh and flavourful Indian poha made with flattened rice, onions, green chilies, curry leaves, and mild spices, garnished with fresh coriander and lemon. Light, wholesome, and perfectly balanced in taste, this comforting breakfast dish is served hot for a delicious and satisfying meal, ideal for any time of the day.",
    costPrice: 70,
    price: 60,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/poha.webp",
    category: "Breakfast",
    isVeg: true,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: "15-20mins",
    calories: 210,
    rating: 4.9,
    reviewCount: 8,
    ingredients: [
      "Poha (Flattened Rice)",
      "Onion",
      "Potato",
      "Peanuts",
      "Mustard Seeds",
      "Curry Leaves",
      "Green Chilies",
      "Turmeric Powder",
      "Oil",
      "Salt",
      "Lemon Juice",
      "Coriander Leaves",
      "Sugar"
    ],
    nutritionalInfo: {
      protein: "44",
      carbs: "4.3",
      fat: "1.8",
      fiber: "2.7"
    },
    attributes: {
      isPopular: false,
      isNew: false,
      isChefSpecial: true,
      isLimited: false
    },
    customizationOptions: [
      {
        name: "Quantity",
        options: [
          "Half",
          "Full (+Rs50)"
        ],
        default: "Half"
      },
      {
        name: "Peanuts",
        options: [
          "Yes",
          "No"
        ],
        default: "Yes"
      },
      {
        name: "Namkeen",
        options: [
          "Yes",
          "No"
        ],
        default: "Yes"
      },
      {
        name: "Beverages",
        options: [
          "No Water",
          "500ml Water Bottle (+Rs10)"
        ],
        default: "No Water"
      }
    ]
  },
  {
    id: 8,
    inStock: true,
    name: "Pyaz Pakodi With Dhaniya Chutney",
    desc: "Crispy golden onion pakodis made with fresh onions, gram flour, and aromatic spices, deep-fried to perfection for an irresistible crunch. Served hot with refreshing dhaniya chutney prepared from fresh coriander, green chilies, and tangy flavors. A perfect tea-time snack packed with spicy, crunchy, and delicious street-style taste.",
    costPrice: 40,
    price: 35,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/pyazPakodi.webp",
    category: "Breakfast",
    isVeg: true,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: "10-15mins",
    calories: 310,
    rating: 4.5,
    reviewCount: 6,
    ingredients: [
      "Onion",
      "Besan (Gram Flour)",
      "Rice Flour",
      "Salt",
      "Green Chilies",
      "Turmeric Powder",
      "Ginger-Garlic Paste",
      "Cumin Seeds",
      "Ajwain (Carom Seeds)",
      "Chaat Masala",
      "Coriander Leaves",
      "Oil for Frying"
    ],
    nutritionalInfo: {
      protein: "5.2",
      carbs: "34.5",
      fat: "19.7",
      fiber: "3.4"
    },
    attributes: {
      isPopular: false,
      isNew: true,
      isChefSpecial: false,
      isLimited: false
    },
    customizationOptions: [
      {
        name: "Quantity",
        options: [
          "Half",
          "Full (+Rs30)"
        ],
        default: "Half"
      },
      {
        name: "Beverages",
        options: [
          "No Water",
          "500ml Water Bottle (+Rs10))"
        ],
        default: "No Water"
      }
    ]
  },
  {
    id: 9,
    inStock: true,
    name: "Fresh Paneer Paratha | High Protein Meal",
    desc: "Enjoy our traditional Indian Buttery Paneer Paratha, stuffed with fresh spiced paneer and roasted to golden perfection with rich butter. Served with flavorful dhaniya chutney for the perfect desi taste. Soft, crispy, and satisfying — a comforting meal packed with authentic Indian flavors in every bite.",
    costPrice: 75,
    price: 65,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/paneerParatha.webp",
    category: "Breakfast",
    isVeg: true,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: "15-20mins",
    calories: 249,
    rating: 5,
    reviewCount: 28,
    ingredients: [
      "Paneer",
      "Salt",
      "Cumin Seeds",
      "Red Chili Powder",
      "Green Chilies",
      "Onion",
      "Dhaniya"
    ],
    nutritionalInfo: {
      protein: "9.8",
      carbs: "28.2",
      fat: "11.7",
      fiber: "4.3"
    },
    attributes: {
      isPopular: true,
      isNew: false,
      isChefSpecial: true,
      isLimited: false
    },
    customizationOptions: [
      {
        name: "Quantity",
        options: [
          "One",
          "Two (+Rs55)"
        ],
        default: "One"
      },
      {
        name: "Beverages",
        options: [
          "No Water",
          "500ml Water Bottle(+Rs10)"
        ],
        default: "No Water"
      }
    ]
  },
  {
    id: 10,
    inStock: true,
    name: "Stuffed Aloo Paratha | Desi Breakfast",
    desc: "Traditional Indian buttery Aloo Paratha, stuffed with perfectly spiced mashed potatoes and cooked golden with rich butter for an authentic homemade taste. Served with fresh, flavorful dhaniya chutney that adds a refreshing zing to every bite. Soft inside, crispy outside — a comforting North Indian favorite, perfect for breakfast, lunch, or anytime cravings.",
    costPrice: 60,
    price: 50,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/alooParatha.webp",
    category: "Breakfast",
    isVeg: true,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: "10-15mins",
    calories: 290,
    rating: 5,
    reviewCount: 12,
    ingredients: [
      "Whole Wheat Atta",
      "Amul Butter",
      "Desi Ghee",
      "Salt",
      "Chilli Power",
      "Dhaniya",
      "Green Chilli"
    ],
    nutritionalInfo: {
      protein: "6.5",
      carbs: "34",
      fat: "9",
      fiber: "4"
    },
    attributes: {
      isPopular: false,
      isNew: false,
      isChefSpecial: true,
      isLimited: false
    },
    customizationOptions: [
      {
        name: "Quantity",
        options: [
          "One",
          "Two (+Rs 45)"
        ],
        default: "One"
      },
      {
        name: "Beverages",
        options: [
          "No Water",
          "500ml Water Bottle(+Rs10)"
        ],
        default: "No Water"
      }
    ]
  },
  {
    id: 11,
    inStock: true,
    name: "Tea in Paper Cup",
    desc: "Experience the comforting taste of traditional Indian chai, brewed with rich tea leaves, milk, and aromatic spices. Paired with crispy, flaky spiced mathri, this classic combo offers the perfect balance of warmth and crunch. A delightful snack for tea lovers, ideal for relaxing evenings, quick breaks, or sharing with family and friends.",
    costPrice: 15,
    price: 12,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/teaInPaperCup.webp",
    category: "Beverages",
    isVeg: true,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: "10-15min",
    calories: 62,
    rating: 5,
    reviewCount: 23,
    ingredients: [
      "Milk",
      "Tea Mix Masala",
      "Sugar",
      "Ginger"
    ],
    nutritionalInfo: {
      protein: "2.2",
      carbs: "11.5",
      fat: "2",
      fiber: "0.5"
    },
    attributes: {
      isPopular: true,
      isNew: false,
      isChefSpecial: false,
      isLimited: false
    },
    customizationOptions: [
      {
        name: "Quantity",
        options: [
          "One",
          "Two(+Rs12)",
          "Three (+Rs 22)"
        ],
        default: "One"
      },
      {
        name: "Snacks",
        options: [
          "No",
          "Parle G(+Rs5)",
          "2 Mathri (+Rs5)"
        ],
        default: "No"
      }
    ]
  },
  {
    id: 12,
    inStock: true,
    name: "Kulhad Tea",
    desc: "Experience the rich aroma of authentic Indian kulhad tea, freshly brewed with premium tea leaves, creamy milk, and flavorful spices. Served in a traditional clay kulhad for an earthy taste and nostalgic charm. Perfectly hot, refreshing, and comforting—delivered fresh to your doorstep for a truly desi tea experience.",
    costPrice: 25,
    price: 18,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/teaInKulhad.webp",
    category: "Beverages",
    isVeg: true,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: "10-15mins",
    calories: 58,
    rating: 5,
    reviewCount: 16,
    ingredients: [
      "Milk",
      "Sugar",
      "Tea Mix Masala",
      "Ginger"
    ],
    nutritionalInfo: {
      protein: "2",
      carbs: "8",
      fat: "0.8",
      fiber: "0.5"
    },
    attributes: {
      isPopular: true,
      isNew: false,
      isChefSpecial: false,
      isLimited: false
    },
    customizationOptions: [
      {
        name: "Quantity",
        options: [
          "One",
          "Two (+Rs15)",
          "Three(+Rs30)"
        ],
        default: "One"
      },
      {
        name: "Snacks",
        options: [
          "No",
          "Parle G(+Rs5)",
          "2 Mathri (+Rs5)"
        ],
        default: "No"
      }
    ]
  },
  {
    id: 13,
    inStock: true,
    name: "500ml Water Bottle",
    desc: "Simple package water bottle 500ml",
    costPrice: "",
    price: 10,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/waterBottle.webp",
    category: "Beverages",
    isVeg: true,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: "",
    calories: "",
    rating: "",
    reviewCount: "",
    ingredients: [],
    nutritionalInfo: {
      protein: "",
      carbs: "",
      fat: "",
      fiber: ""
    },
    attributes: {
      isPopular: false,
      isNew: false,
      isChefSpecial: false,
      isLimited: true
    },
    customizationOptions: [
      {
        name: "Quantity",
        options: [
          "One",
          "Two (+Rs10)"
        ],
        default: "One"
      }
    ]
  },
  {
    id: 14,
    inStock: true,
    name: "Lemon Sikanji",
    desc: "Refreshing and fizzy, our Lemon Sikanji is a perfect blend of fresh mint leaves, zesty lime, crushed ice, and sparkling soda with a hint of sweetness. This cool and energizing drink is crafted to refresh your mood and complement every meal, making it an ideal choice for a relaxing and flavorful experience.",
    costPrice: 60,
    price: 50,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/lemonSikanji.webp",
    category: "Beverages",
    isVeg: true,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: "5-10mins",
    calories: 110,
    rating: 5,
    reviewCount: 23,
    ingredients: [
      "Lemon",
      "Soda",
      "Sugar",
      "Mint Leaves"
    ],
    nutritionalInfo: {
      protein: "0",
      carbs: "28",
      fat: "0",
      fiber: "0.1"
    },
    attributes: {
      isPopular: true,
      isNew: false,
      isChefSpecial: false,
      isLimited: false
    },
    customizationOptions: [
      {
        name: "Quantity",
        options: [
          "One",
          "Two(+Rs45)"
        ],
        default: "One"
      }
    ]
  },
  {
    id: 15,
    inStock: true,
    name: "Paneer Bhurji",
    desc: "A popular North Indian breakfast dish of crumbled paneer sautéed with onions, tomatoes, and a blend of aromatic spices. It’s quick, flavorful, and pairs wonderfully with bread or parathas",
    costPrice: 80,
    price: 65,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/paneerBhurji.webp",
    category: "North Indian",
    isVeg: true,
    isSpicy: true,
    isGlutenFree: false,
    preparationTime: "15-20mins",
    calories: 232,
    rating: 5,
    reviewCount: 17,
    ingredients: [
      "Paneer",
      "Onions",
      "Tomatoes",
      "Green Chilies",
      "Ginger",
      "Garlic",
      "Turmeric Powder",
      "Red Chili Powder",
      "Coriander Powder",
      "Cumin Seeds",
      "Oil or Ghee",
      "Salt",
      "Coriander Leaves"
    ],
    nutritionalInfo: {
      protein: "9.4",
      carbs: "11.6",
      fat: "15.2",
      fiber: "3.2"
    },
    attributes: {
      isPopular: false,
      isNew: false,
      isChefSpecial: true,
      isLimited: false
    },
    customizationOptions: [
      {
        name: "Quanity",
        options: [
          "300ml",
          "500ml (+Rs30)"
        ],
        default: "300ml"
      }
    ]
  },
  {
    id: 16,
    inStock: true,
    name: "Paneer Bhurji with 2 Parathas",
    desc: "Scrambled, spiced paneer (cottage cheese) cooked with onions, tomatoes, and aromatic spices, served with two crisp, pan-fried whole wheat flatbreads called parathas. This flavorful and protein-rich meal is a popular Indian vegetarian comfort food",
    costPrice: 110,
    price: 95,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/paneerbhurjiParatha.webp",
    category: "Meal",
    isVeg: true,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: "15-20min",
    calories: 289,
    rating: 5,
    reviewCount: 37,
    ingredients: [
      "Paneer",
      "Onion",
      "Tomato",
      "Green Chilli",
      "Ginger",
      "Garlic",
      "Turmeric Powder",
      "Red Chilli Powder",
      "Cumin Powder",
      "Coriander Powder",
      "Garam Masala",
      "Kasuri Methi",
      "Salt",
      "Oil",
      "Whole Wheat Flour"
    ],
    nutritionalInfo: {
      protein: "9.3",
      carbs: "14",
      fat: "7.2",
      fiber: "4"
    },
    attributes: {
      isPopular: false,
      isNew: false,
      isChefSpecial: true,
      isLimited: false
    },
    customizationOptions: [
      {
        name: "Beverages",
        options: [
          "No Water",
          "500ml Water Bottle"
        ],
        default: "No Water"
      }
    ]
  },
  {
    id: 17,
    inStock: true,
    name: "Paratha (2 Pieces)",
    desc: "A traditional, layered Indian flatbread made from whole wheat flour and pan-fried with ghee or oil. It is a versatile, crispy, and flaky bread, often served for breakfast or as a hearty accompaniment to curries, vegetables, and yogurt",
    costPrice: 36,
    price: 32,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/parathaButter.webp",
    category: "Breads",
    isVeg: true,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: "5-10mins",
    calories: 260,
    rating: 5,
    reviewCount: 9,
    ingredients: [
      "Whole Wheat Flour",
      "Water",
      "Salt",
      "Oil/Ghee"
    ],
    nutritionalInfo: {
      protein: "5",
      carbs: "35",
      fat: "10",
      fiber: "2.5"
    },
    attributes: {
      isPopular: false,
      isNew: true,
      isChefSpecial: false,
      isLimited: false
    },
    customizationOptions: [
      {
        name: "Quantity",
        options: [
          "Two",
          "Three(+Rs16)"
        ],
        default: "Two"
      }
    ]
  },
  {
    id: 18,
    inStock: true,
    name: "Roti (2 Piece)",
    desc: "Roti is a traditional Indian unleavened flatbread. Made daily in many homes from simple whole wheat flour and water, it is dry-roasted on a griddle. It is a staple accompaniment to curries, vegetables, and lentils",
    costPrice: 28,
    price: 25,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/rotiWholeWheat.webp",
    category: "Breads",
    isVeg: true,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: "5-10mins",
    calories: 275,
    rating: 5,
    reviewCount: 13,
    ingredients: [
      "Whole Wheat Flour (Atta)",
      "Water"
    ],
    nutritionalInfo: {
      protein: "9",
      carbs: "41",
      fat: "8",
      fiber: "5"
    },
    attributes: {
      isPopular: false,
      isNew: true,
      isChefSpecial: false,
      isLimited: false
    },
    customizationOptions: [
      {
        name: "Quantity",
        options: [
          "Two",
          "Three(+Rs13)"
        ],
        default: "Two"
      },
      {
        name: "Extra Apply",
        options: [
          "No",
          "Ghee (+Rs10)"
        ],
        default: "No"
      }
    ]
  },
  {
    id: 19,
    inStock: true,
    name: "Two Kababs & Two Paratha",
    desc: "Two spiced, pan-fried kababs made from mashed kidney beans or chickpeas, served with two crisp, whole-wheat flatbreads. This high-protein, high-fiber Indian meal is a nutritious and flavorful vegetarian option.",
    costPrice: 60,
    price: 50,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/kababParatha.webp",
    category: "Meal",
    isVeg: true,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: "15-20mins",
    calories: 560,
    rating: 4.7,
    reviewCount: 6,
    ingredients: [
      "Kidney Beans or Chickpeas",
      "Onion",
      "Ginger Garlic Paste",
      "Green Chilies",
      "Coriander",
      "Salt",
      "Cumin Powder",
      "Red Chili Powder",
      "Garam Masala",
      "Lemon Juice",
      "Gram Flour (Besan)",
      "Oil for Frying",
      "Whole Wheat Flour",
      "Water"
    ],
    nutritionalInfo: {
      protein: "26",
      carbs: "68",
      fat: "18",
      fiber: "8"
    },
    attributes: {
      isPopular: false,
      isNew: true,
      isChefSpecial: false,
      isLimited: false
    },
    customizationOptions: [
      {
        name: "Quantiy",
        options: [
          "Two",
          "Three (+Rs25)"
        ],
        default: "Two"
      },
      {
        name: "Beverages",
        options: [
          "No Water",
          "500ml Water Bottle (+Rs10)"
        ],
        default: "No Water"
      }
    ]
  },
  {
    id: 20,
    inStock: true,
    name: "Sweet Lassi",
    desc: "A traditional Indian beverage made from creamy yogurt, blended with water, sugar or salt, and cardamom. Served chilled, it is a refreshing, probiotic-rich drink that perfectly cools down spicy meals",
    costPrice: 60,
    price: 50,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/lassi.webp",
    category: "Beverages",
    isVeg: true,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: "5-10mins",
    calories: 164,
    rating: 5,
    reviewCount: 28,
    ingredients: [
      "Dahi",
      "Sugar",
      "Milk"
    ],
    nutritionalInfo: {
      protein: "5.3",
      carbs: "16.5",
      fat: "5.9",
      fiber: "0.4"
    },
    attributes: {
      isPopular: false,
      isNew: false,
      isChefSpecial: true,
      isLimited: false
    },
    customizationOptions: [
      {
        name: "Quantity",
        options: [
          "One",
          "Two (+Rs45)"
        ],
        default: "One"
      }
    ]
  },
  {
    id: 21,
    inStock: true,
    name: "Crispy Aloo Kachori With Dhaniya chutney",
    desc: "Crispy whole wheat kachoris stuffed with flavorful spiced aloo filling, freshly fried to golden perfection. Served with refreshing dhaniya chutney for the perfect balance of spice and freshness. A wholesome and satisfying Indian snack, packed with authentic homemade taste and delicious aroma in every bite.",
    costPrice: 35,
    price: 30,
    img: "https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/alooKachori.webp",
    category: "Breakfast",
    isVeg: true,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: "10-15mins",
    calories: 280,
    rating: 4.8,
    reviewCount: 12,
    ingredients: [
      "Whole Wheat Atta",
      "Vegetable Sunflower Oil",
      "Potato",
      "Dhaniya",
      "Salt",
      "Green Chilli",
      "Onion"
    ],
    nutritionalInfo: {
      protein: "07",
      carbs: "46",
      fat: "80",
      fiber: "12"
    },
    attributes: {
      isPopular: false,
      isNew: true,
      isChefSpecial: false,
      isLimited: false
    },
    customizationOptions: [
      {
        name: "Quantity",
        options: [
          "One",
          "Two (+25)"
        ],
        default: "One"
      }
    ]
  }
];