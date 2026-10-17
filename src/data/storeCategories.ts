// src/data/storeCategories.ts
import { StoreCategory } from '../types';

export interface StoreCategoryDef {
  /** Value stored in the DB (`star_veg_tenants.store_category`). */
  value: StoreCategory;
  /** Short label used in selects, pills, badges. */
  label: string;
  /**
   * Short hint shown inside the option row (existing behavior).
   * Keep it short - it appears inline with the label.
   */
  hint: string;
  /**
   * One-sentence description shown as a banner under the select when
   * this category is chosen during signup. Also used on the
   * homepage audience cards.
   */
  description: string;
  /**
   * Marketing image for the homepage audience card.
   * Leave as a stable URL (jsdelivr / unsplash placeholder for now).
   */
  image: string;
  /**
   * Accent color used on the audience card's icon chip. Purely
   * presentational - optional. Defaults handled in the component.
   */
  accent: 'green' | 'blue' | 'amber' | 'purple' | 'rose' | 'teal';
}

export const STORE_CATEGORIES: StoreCategoryDef[] = [
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
  {
    value: 'fashion-lifestyle',
    label: 'Fashion & Lifestyle',
    hint: 'Clothing, jewellery, beauty',
    description:
      'Show off your collection with galleries and variants. Share a single store link customers can browse and order from.',
    image:
      'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
    accent: 'rose',
  },
  {
    value: 'home-living',
    label: 'Home & Living',
    hint: 'Furniture, decor, electronics',
    description:
      'A visual catalogue for furniture, decor and electronics. Customers can browse by category and reach out to order.',
    image:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80',
    accent: 'teal',
  },
  {
    value: 'books-office',
    label: 'Books & Office',
    hint: 'Stationery, books, office supplies',
    description:
      'A searchable catalogue of books, stationery and office supplies. Customers find what they need and order directly.',
    image:
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80',
    accent: 'blue',
  },
  {
    value: 'services-events',
    label: 'Services & Events',
    hint: 'Salons, photographers, event pros',
    description:
      'A service catalogue with descriptions and pricing. Customers book or enquire directly via WhatsApp.',
    image:
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80',
    accent: 'purple',
  },
  {
    value: 'other-shops',
    label: 'Other Shops',
    hint: 'Anything else you sell',
    description:
      'A flexible catalogue for any shop that doesn\'t fit the other categories. Add products, set prices, share your link.',
    image:
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
    accent: 'green',
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