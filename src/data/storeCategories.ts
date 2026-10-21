// src/data/storeCategories.ts
import type { StoreCategory, FormFieldOption } from '../types';

export interface StoreCategoryDef {
  /** Value stored in the DB (`star_veg_tenants.store_category`). */
  value: StoreCategory;
  /** Short label used in selects, pills, badges. */
  label: string;
  /** Short hint shown inside the option row. */
  hint: string;
  /** One-sentence description shown as a banner under the select. */
  description: string;
  /** Marketing image for the homepage audience card. */
  image: string;
  /** Accent color used on the audience card's icon chip. */
  accent: 'green' | 'blue' | 'amber' | 'purple' | 'rose' | 'teal';

  /**
   * Human-friendly overrides for standard field labels. Keys match
   * `FormFieldConfig.key` values (`desc`, `ingredients`, `nutritionalInfo`,
   * `preparationTime`, `calories`, `isSpicy`, `isGlutenFree`, etc.).
   * Only applied when the tenant hasn't already customized the label.
   */
  fieldLabels?: Partial<Record<string, string>>;

  /**
   * Which built-in fields are disabled for this category. Fields in
   * this list are forced to `enabled: false` and do not render in the
   * admin form.
   */
  disabledFields?: string[];

  /**
   * Optional per-category overrides for badge labels ("Popular",
   * "New", "Chef's Special", "Limited"). Badges not overridden keep
   * their default label.
   */
  badgeLabels?: Partial<Record<string, string>>;

  /**
   * Which built-in badges make sense for this category. Badges not
   * listed are auto-disabled for new signups.
   */
  enabledBadges?: string[];

  /**
   * Replaces the food-default `nutritionalInfo` headings. Only applied
   * when the tenant hasn't customized the headings. Accepts plain
   * strings or `{ name, value }` where `value` is the placeholder text.
   */
  nutritionalHeadings?: Array<string | FormFieldOption>;
}

export const STORE_CATEGORIES: StoreCategoryDef[] = [
  // ============================================================
  // FOOD & BEVERAGE — uses the food defaults unchanged
  // ============================================================
  {
    value: 'food-beverage',
    label: 'Food & Beverage',
    hint: 'Restaurants, cafes, cloud kitchens',
    description:
      'Perfect for restaurants, cafes and cloud kitchens. Get a QR menu, take WhatsApp orders, run dine-in and print instant bills.',
    image:
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80',
    accent: 'amber',
  },

  // ============================================================
  // FASHION & LIFESTYLE
  // ============================================================
  {
    value: 'fashion-lifestyle',
    label: 'Fashion & Lifestyle',
    hint: 'Clothing, jewellery, beauty',
    description:
      'Show off your collection with galleries and variants. Share a single store link customers can browse and order from.',
    image:
      'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
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

  // ============================================================
  // HOME & LIVING (furniture, decor, home essentials)
  // ============================================================
  {
    value: 'home-living',
    label: 'Home & Living',
    hint: 'Furniture, decor, home essentials',
    description:
      'A visual catalogue for furniture, decor and home essentials. Customers can browse by category and reach out to order.',
    image:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80',
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

  // ============================================================
  // BOOKS & OFFICE
  // ============================================================
  {
    value: 'books-office',
    label: 'Books & Office',
    hint: 'Stationery, books, office supplies',
    description:
      'A searchable catalogue of books, stationery and office supplies. Customers find what they need and order directly.',
    image:
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80',
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

  // ============================================================
  // SERVICES & EVENTS
  // ============================================================
  {
    value: 'services-events',
    label: 'Services & Events',
    hint: 'Salons, photographers, event pros',
    description:
      'A service catalogue with descriptions and pricing. Customers book or enquire directly via WhatsApp.',
    image:
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80',
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

  // ============================================================
  // OTHER SHOPS — flexible / generic
  // ============================================================
  {
    value: 'other-shops',
    label: 'Other Shops',
    hint: 'Anything else you sell',
    description:
      "A flexible catalogue for any shop that doesn't fit the other categories. Add products, set prices, share your link.",
    image:
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
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

/** Label lookup used by badges, admin panel, etc. */
export const getCategoryLabel = (
  value: StoreCategory | undefined,
): string => {
  if (!value) return 'Store';
  return (
    STORE_CATEGORIES.find((c) => c.value === value)?.label ?? 'Store'
  );
};

/** Full definition lookup - used by the signup banner and homepage. */
export const getCategoryDef = (
  value: StoreCategory | undefined,
): StoreCategoryDef | undefined =>
  value ? STORE_CATEGORIES.find((c) => c.value === value) : undefined;

/** Helper for the admin form: does this category disable a field? */
export const isFieldDisabledForCategory = (
  category: StoreCategory | undefined,
  fieldKey: string,
): boolean => {
  if (!category) return false;
  const def = getCategoryDef(category);
  return def?.disabledFields?.includes(fieldKey) ?? false;
};

/** Helper for the admin form: override label or fall back. */
export const getFieldLabelForCategory = (
  category: StoreCategory | undefined,
  fieldKey: string,
  fallback: string,
): string => {
  if (!category) return fallback;
  const def = getCategoryDef(category);
  return def?.fieldLabels?.[fieldKey]?.trim() || fallback;
};