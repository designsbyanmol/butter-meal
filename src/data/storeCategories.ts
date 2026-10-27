// src/data/storeCategories.ts
import type { StoreCategory, FormFieldOption } from '../types';

export interface StoreCategoryDef {
  value: StoreCategory;
  label: string;
  hint: string;
  description: string;
  image: string;
  accent: 'green' | 'blue' | 'amber' | 'purple' | 'rose' | 'teal';
  fieldLabels?: Partial<Record<string, string>>;
  disabledFields?: string[];
  badgeLabels?: Partial<Record<string, string>>;
  enabledBadges?: string[];
  nutritionalHeadings?: Array<string | FormFieldOption>;
}

const CDN = 'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/assets';

export const STORE_CATEGORIES: StoreCategoryDef[] = [
  {
    value: 'food-beverage',
    label: 'Food & Beverage',
    hint: 'Restaurants, cafes, cloud kitchens',
    description:
      'Perfect for restaurants, cafes and cloud kitchens. Get a QR menu, take WhatsApp orders, run dine-in and print instant bills.',
    image: `${CDN}/coffee.webp`.replace('dining', 'dinin'), // dinin.webp
    accent: 'amber',
  },
  {
    value: 'fashion-lifestyle',
    label: 'Fashion & Lifestyle',
    hint: 'Clothing, jewellery, beauty',
    description:
      'Show off your collection with galleries and variants. Share a single store link customers can browse and order from.',
    image: `${CDN}/ear-rings.webp`,
    accent: 'rose',
    fieldLabels: {
      desc: 'Description',
      ingredients: 'Fabric / Materials',
      nutritionalInfo: 'Care & Details',
      preparationTime: 'Delivery Time',
      calories: 'Weight (g)',
      isSpicy: 'Fragile',
    },
    disabledFields: ['isGlutenFree'],
    badgeLabels: {
      isChefSpecial: "Editor's Pick",
      isLimited: 'Limited Edition',
    },
    enabledBadges: ['isPopular', 'isNew', 'isChefSpecial', 'isLimited'],
    nutritionalHeadings: [
      { name: 'Fabric', value: 'e.g. 100% Cotton' },
      { name: 'Care', value: 'e.g. Machine wash cold' },
      { name: 'Country of Origin', value: 'e.g. India' },
      { name: 'Fit', value: 'e.g. Regular' },
    ],
  },
  {
    value: 'home-living',
    label: 'Home & Living',
    hint: 'Furniture, decor, home essentials',
    description:
      'A visual catalogue for furniture, decor and home essentials. Customers can browse by category and reach out to order.',
    image: `${CDN}/living-room.webp`,
    accent: 'teal',
    fieldLabels: {
      desc: 'Product Description',
      ingredients: 'Materials & Finish',
      nutritionalInfo: 'Specifications',
      preparationTime: 'Delivery & Assembly',
      calories: 'Weight / Dimensions',
      isSpicy: 'Fragile / Handle with Care',
    },
    disabledFields: ['isGlutenFree'],
    badgeLabels: {
      isChefSpecial: 'Featured',
      isLimited: 'Limited Stock',
    },
    enabledBadges: ['isPopular', 'isNew', 'isChefSpecial', 'isLimited'],
    nutritionalHeadings: [
      { name: 'Dimensions', value: 'e.g. 120 x 80 x 75 cm' },
      { name: 'Material', value: 'e.g. Sheesham wood' },
      { name: 'Warranty', value: 'e.g. 2 years' },
      { name: 'SKU', value: 'e.g. SKU-1042' },
    ],
  },
  {
    value: 'books-office',
    label: 'Books & Office',
    hint: 'Stationery, books, office supplies',
    description:
      'A searchable catalogue of books, stationery and office supplies. Customers find what they need and order directly.',
    image: `${CDN}/library.webp`,
    accent: 'blue',
    fieldLabels: {
      desc: 'Description / Synopsis',
      ingredients: 'Contents / Materials',
      nutritionalInfo: 'Book / Product Details',
      preparationTime: 'Delivery Time',
      calories: 'Weight (g)',
    },
    disabledFields: ['isSpicy', 'isGlutenFree', 'nutritionalInfo'],
    badgeLabels: {
      isChefSpecial: 'Staff Pick',
      isLimited: 'Limited Stock',
    },
    enabledBadges: ['isPopular', 'isNew', 'isChefSpecial', 'isLimited'],
    nutritionalHeadings: [
      { name: 'Pages', value: 'e.g. 320' },
      { name: 'Binding', value: 'e.g. Paperback' },
      { name: 'Publisher', value: 'e.g. Penguin' },
      { name: 'ISBN', value: 'e.g. 978-3-16-148410-0' },
    ],
  },
  {
    value: 'services-events',
    label: 'Services & Events',
    hint: 'Salons, photographers, event pros',
    description:
      'A service catalogue with descriptions and pricing. Customers book or enquire directly via WhatsApp.',
    image: `${CDN}/balooon.webp`,
    accent: 'purple',
    fieldLabels: {
      desc: 'Service Description',
      ingredients: "What's Included",
      nutritionalInfo: 'Service Details',
      preparationTime: 'Duration',
      calories: 'Capacity / Size',
    },
    disabledFields: ['isSpicy', 'isGlutenFree', 'nutritionalInfo', 'calories'],
    badgeLabels: {
      isChefSpecial: 'Top Rated',
      isLimited: 'Book Early',
    },
    enabledBadges: ['isPopular', 'isNew', 'isChefSpecial', 'isLimited'],
    nutritionalHeadings: [
      { name: 'Inclusions', value: 'e.g. Consultation + haircut' },
      { name: 'Exclusions', value: 'e.g. Colour treatment' },
      { name: 'Duration', value: 'e.g. 60 min' },
      { name: 'Best For', value: 'e.g. Weddings, birthdays' },
    ],
  },
  {
    value: 'hospital-pharmacy',
    label: 'Hospital & Pharmacy',
    hint: 'Clinics, pharmacies, hospitals',
    description:
      'Manage pharmacy stock, print A5 GST bills, and track patient history. Includes OPD/IPD (coming soon).',
    image: `${CDN}/apple.webp`, // Replace with a real hospital image on your CDN
    accent: 'teal',
    fieldLabels: {
      desc: 'Composition / Description',
      ingredients: 'Active Ingredients',
      preparationTime: 'Dosage',
      calories: 'Strength / Weight',
      isVeg: 'Prescription Required',
      isSpicy: 'Schedule H Drug',
    },
    disabledFields: ['isGlutenFree', 'nutritionalInfo'],
    badgeLabels: {
      isPopular: 'Fast Moving',
      isNew: 'New Stock',
      isChefSpecial: 'Critical Care',
      isLimited: 'Low Stock',
    },
    enabledBadges: ['isPopular', 'isNew', 'isChefSpecial', 'isLimited'],
    nutritionalHeadings: [],
  },
  {
    value: 'other-shops',
    label: 'Other Shops',
    hint: 'Anything else you sell',
    description:
      "A flexible catalogue for any shop that doesn't fit the other categories. Add products, set prices, share your link.",
    image: `${CDN}/computer%20table.webp`,
    accent: 'green',
    fieldLabels: {
      desc: 'Description',
      ingredients: 'Materials / Contents',
      nutritionalInfo: 'Specifications',
      preparationTime: 'Delivery Time',
      calories: 'Weight (g)',
    },
    disabledFields: ['isSpicy', 'isGlutenFree'],
    badgeLabels: {
      isChefSpecial: 'Featured',
      isLimited: 'Limited',
    },
    enabledBadges: ['isPopular', 'isNew', 'isChefSpecial', 'isLimited'],
    nutritionalHeadings: [
      { name: 'Material', value: 'e.g. Aluminium' },
      { name: 'Dimensions', value: 'e.g. 20 x 15 x 5 cm' },
      { name: 'Warranty', value: 'e.g. 6 months' },
      { name: 'SKU', value: 'e.g. SKU-201' },
    ],
  },
];

export const getCategoryLabel = (
  value: StoreCategory | undefined,
): string => {
  if (!value) return 'Store';
  return (
    STORE_CATEGORIES.find((c) => c.value === value)?.label ?? 'Store'
  );
};

export const getCategoryDef = (
  value: StoreCategory | undefined,
): StoreCategoryDef | undefined =>
  value ? STORE_CATEGORIES.find((c) => c.value === value) : undefined;

export const isFieldDisabledForCategory = (
  category: StoreCategory | undefined,
  fieldKey: string,
): boolean => {
  if (!category) return false;
  const def = getCategoryDef(category);
  return def?.disabledFields?.includes(fieldKey) ?? false;
};

export const getFieldLabelForCategory = (
  category: StoreCategory | undefined,
  fieldKey: string,
  fallback: string,
): string => {
  if (!category) return fallback;
  const def = getCategoryDef(category);
  return def?.fieldLabels?.[fieldKey]?.trim() || fallback;
};