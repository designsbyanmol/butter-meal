// src/data/plans.ts

/**
 * Marketing copy for each subscription plan.
 *
 * Pricing and `isActive` state live in the database (`star_veg_plans`);
 * this module owns the *what's included* copy that must be identical
 * everywhere a plan card is shown - homepage, signup, plan change
 * modal, super-admin plan tab.
 */

export interface PlanDefinition {
  /** Short marketing tagline, one line, shown under the plan name. */
  tagline: string;
  /** What's included. Rendered as green checkmark bullets. */
  included: string[];
  /** What's not included. Rendered as greyed-out bullets with a cross. */
  excluded?: string[];
  /** Longer description for detail modals / super-admin plan list. */
  description: string;
  /** Which surface gets the "Popular" ribbon. */
  featured?: boolean;
  /** Accent used by the card header band. */
  accent: 'green' | 'blue' | 'purple' | 'amber';
}

export const PLAN_DEFINITIONS: Record<string, PlanDefinition> = {
  basic: {
    tagline: 'Menu-only, always free to try',
    description:
      'A clean digital menu and catalogue for your shop. Showcase items, prices and photos behind a shareable link and QR code - perfect for getting online without committing to ordering or billing features.',
    included: [
      'Digital menu & catalogue',
      'Editable items, prices, photos',
      'Store info & contact details',
      'Public store link + QR code',
      'Basic analytics on store visits',
    ],
    excluded: [
      'WhatsApp ordering',
      'Dine-in QR ordering',
      'Instant billing',
      'Reviews & wishlist',
    ],
    featured: false,
    accent: 'blue',
  },

  dynamic: {
    tagline: 'For shops taking WhatsApp orders',
    description:
      'Everything in Basic plus a full WhatsApp ordering flow. Customers build a cart, add customizations, leave notes, and place the order - you get a neatly formatted message on your store number.',
    included: [
      'Everything in Basic',
      'Direct WhatsApp ordering',
      'Add-to-cart & live cart',
      'Custom message on items',
      'Customizable WhatsApp templates',
      'Store manager & editable fields',
    ],
    excluded: [
      'Dine-in QR ordering',
      'Instant 80mm billing',
      'Reviews & wishlist',
    ],
    featured: false,
    accent: 'green',
  },

  professional: {
    tagline: 'For restaurants running dine-in + billing',
    description:
      'The full Dozzelo experience. Dine-in QR ordering, per-item served tracking, instant thermal bills, staff tips, customer reviews, wishlist, and multi-user access with role-based controls.',
    included: [
      'Everything in Dynamic',
      'Dine-in QR ordering & live tables',
      'Instant 80mm billing',
      'Staff tips & UPI payments',
      'Customer reviews & ratings',
      'Wishlist for customers',
      'User management & roles',
      'Banner & profile customization',
    ],
    featured: true,
    accent: 'purple',
  },
};

/** Fallback used when a DB plan id has no matching definition. */
const FALLBACK_DEFINITION: PlanDefinition = {
  tagline: '',
  description: '',
  included: [],
  excluded: [],
  featured: false,
  accent: 'blue',
};

/**
 * Safe lookup. Never returns undefined - unknown ids fall back to an
 * empty definition so the UI degrades gracefully when a plan is added
 * in the DB without a matching copy block.
 */
export const getPlanDefinition = (planId: string): PlanDefinition =>
  PLAN_DEFINITIONS[planId] ?? FALLBACK_DEFINITION;

/**
 * A feature is available on a plan if the plan's `included` list
 * contains it OR the plan id matches exactly. Used to render the
 * cross-plan comparison table.
 */
export const PLAN_FEATURE_MATRIX: {
  feature: string;
  plans: Record<string, boolean>;
}[] = [
  {
    feature: 'Digital menu & catalogue',
    plans: { basic: true, dynamic: true, professional: true },
  },
  {
    feature: 'Public store link + QR code',
    plans: { basic: true, dynamic: true, professional: true },
  },
  {
    feature: 'WhatsApp ordering',
    plans: { basic: false, dynamic: true, professional: true },
  },
  {
    feature: 'Store manager',
    plans: { basic: false, dynamic: true, professional: true },
  },
  {
    feature: 'Dine-in QR ordering',
    plans: { basic: false, dynamic: false, professional: true },
  },
  {
    feature: 'Instant 80mm billing',
    plans: { basic: false, dynamic: false, professional: true },
  },
  {
    feature: 'Staff tips & UPI payments',
    plans: { basic: false, dynamic: false, professional: true },
  },
  {
    feature: 'Reviews & ratings',
    plans: { basic: false, dynamic: false, professional: true },
  },
  {
    feature: 'User management',
    plans: { basic: false, dynamic: false, professional: true },
  },
];

export const PLAN_DISPLAY_PRICES: Record<string, number> = {
  basic: 49,
  dynamic: 99,
  professional: 199,
};