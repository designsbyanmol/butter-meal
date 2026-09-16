// types/index.ts

// =========================================================
// USERS
// =========================================================

export interface User {
  id: string;
  phone: string;
  name: string;
  password: string;
  role: 'admin' | 'user';
  isActive: boolean;
  tenantId?: string;
  tenantSlug?: string;
  createdAt: string;
  lastLogin?: string;
}

// =========================================================
// STORE SETTINGS
// =========================================================

export interface StoreSettings {
  isOpen: boolean;
  closedMessage: string;
  expectedOpenDate: string;
  expectedOpenTime: string;
  lastUpdated: string;
}

// =========================================================
// MENU — CUSTOMIZATION
// =========================================================

/** A single choice within a customization group. */
export interface CustomizationChoice {
  name: string;
  price: number; // add-on price in Rs; 0 means no extra charge
}

/** A customization group with its choices and optional default. */
export interface CustomizationOption {
  name: string;
  choices: CustomizationChoice[];
  default?: string; // must match one of choices[].name
}

// =========================================================
// MENU — FORM SCHEMA (per-tenant form builder)
// =========================================================

export type FormFieldType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'checkbox'
  | 'select';

export interface FormFieldConfig {
  /** Internal id. Built-ins have fixed keys; custom fields use `custom_*`. */
  key: string;
  /** Label shown on the form. Renameable for non-locked fields. */
  label: string;
  type: FormFieldType;
  /** Include the field in the Add/Edit form. */
  enabled: boolean;
  /** True for the built-in fields shipped with the app. */
  builtin: boolean;
  /** True only for user-added fields that can be removed. */
  removable: boolean;
  /** Locked fields cannot be renamed or disabled. */
  locked?: boolean;
  /** Options for `select` type fields (also used by `category`). */
  options?: string[];
}

export interface FormSchema {
  fields: FormFieldConfig[];
}

export const DEFAULT_FORM_SCHEMA: FormSchema = {
  fields: [
    // Locked built-ins — always present, cannot be renamed or hidden
    { key: 'name',            label: 'Name',             type: 'text',     enabled: true, builtin: true, removable: false, locked: true },
    { key: 'img',             label: 'Image',            type: 'text',     enabled: true, builtin: true, removable: false, locked: true },
    { key: 'price',           label: 'Price',            type: 'number',   enabled: true, builtin: true, removable: false, locked: true },
    { key: 'discount',        label: 'Discount (%)',     type: 'number',   enabled: true, builtin: true, removable: false, locked: true }, // ← NEW
    { key: 'desc',            label: 'Description',      type: 'textarea', enabled: true, builtin: true, removable: false, locked: true },
    { key: 'costPrice',       label: 'Cost Price',       type: 'number',   enabled: true, builtin: true, removable: false, locked: true },
    { key: 'rating',          label: 'Rating',           type: 'number',   enabled: true, builtin: true, removable: false, locked: true },
    { key: 'reviewCount',     label: 'Review Count',     type: 'number',   enabled: true, builtin: true, removable: false, locked: true },
    { key: 'inStock',         label: 'In Stock',         type: 'checkbox', enabled: true, builtin: true, removable: false, locked: true },

    // Editable built-ins
    { key: 'category',        label: 'Category',         type: 'select',   enabled: true, builtin: true, removable: false, options: [] },
    { key: 'preparationTime', label: 'Preparation Time', type: 'text',     enabled: true, builtin: true, removable: false },
    { key: 'calories',        label: 'Calories',         type: 'number',   enabled: true, builtin: true, removable: false },
    { key: 'ingredients',     label: 'Ingredients',      type: 'text',     enabled: true, builtin: true, removable: false },
    { key: 'isVeg',           label: 'Vegetarian',       type: 'checkbox', enabled: true, builtin: true, removable: false },
    { key: 'isSpicy',         label: 'Spicy',            type: 'checkbox', enabled: true, builtin: true, removable: false },
    { key: 'isGlutenFree',    label: 'Gluten Free',      type: 'checkbox', enabled: true, builtin: true, removable: false },
  ],
};

// =========================================================
// MENU — ITEMS
// =========================================================

export type MenuItemAttributes = {
  isPopular?: boolean;
  isNew?: boolean;
  isChefSpecial?: boolean;
  isLimited?: boolean;
  // Allow custom fields (any string key) with JSON-serializable values
  [key: string]: boolean | string | number | undefined;
};

export interface MenuItem {
  id: number;
  sortOrder?: number;
  inStock: boolean;
  name: string;
  desc: string;
  costPrice?: number;
  price: number;
  discount?: number;
  img: string;
  /** Optional multi-image gallery. First item matches `img`. */
  gallery?: string[];
  category?: string;
  isVeg?: boolean;
  isSpicy?: boolean;
  isGlutenFree?: boolean;
  preparationTime?: string;
  calories?: number;
  rating?: number;
  reviewCount?: number;
  ingredients?: string[];
  nutritionalInfo?: {
    protein?: string;
    carbs?: string;
    fat?: string;
    fiber?: string;
  };
  attributes?: MenuItemAttributes;
  customizationOptions?: CustomizationOption[];
}

// =========================================================
// CART
// =========================================================

export interface CartItem extends MenuItem {
  quantity: number;
  customizations?: Record<string, string>;
  customMessage?: string;
  addonPrice?: number;
  basePrice?: number;
}

// =========================================================
// SCHEDULE / PAYMENT / DELIVERY
// =========================================================

export interface ScheduleData {
  date: string;
  time: string;
}

export type PaymentMode = 'COD' | 'Online';
export type DeliveryType = 'now' | 'schedule';

// =========================================================
// AUTH
// =========================================================

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// =========================================================
// TENANT (context type — the DB row is mapped from this)
// =========================================================

export interface Tenant {
  id: string;
  slug: string;
  displayName: string;
  whatsappPhone?: string;
  isActive?: boolean;
  formSchema?: FormSchema;
}

// =========================================================
// WHATSAPP MESSAGE TEMPLATE
// =========================================================

export interface MessageTemplate {
  // ---- Header ----
  orderLabel: string;          // e.g., "New Order From {customerName}"
  namePrompt: string;          // shown in the customer-name popup
  namePromptPlaceholder: string;

  // ---- Item list ----
  itemListTitle: string;       // "Item List"
  itemLineTemplate: string;    // "{name} x {qty}" — order of tokens, not style
  showItemDiscount: boolean;   // append "(X% off)" when item has a discount
  showItemAddons: boolean;     // append "[+RsN add-ons]"
  showItemCustomizations: boolean;
  showItemNotes: boolean;      // append the item's special instructions

  // ---- Pricing ----
  subtotalLabel: string;
  deliveryLabel: string;
  discountLabel: string;
  totalLabel: string;
  freeDeliveryLabel: string;   // e.g., "(+Rs {fee} Inc. for delivery)"

  // ---- Footer ----
  footerNote1: string;
  footerNote2: string;
  footerSignature: string;
}

export const DEFAULT_MESSAGE_TEMPLATE: MessageTemplate = {
  orderLabel: 'New Order From {customerName}',
  namePrompt: 'Please enter your name',
  namePromptPlaceholder: 'e.g., Anmol',

  itemListTitle: 'Item List',
  itemLineTemplate: '{name} x {qty}',
  showItemDiscount: true,
  showItemAddons: true,
  showItemCustomizations: true,
  showItemNotes: true,

  subtotalLabel: 'Subtotal',
  deliveryLabel: 'Delivery',
  discountLabel: 'Discount',
  totalLabel: 'Total Amount',
  freeDeliveryLabel: '(+Rs {fee} Inc. for delivery)',

  footerNote1:
    'We take orders on trust. Once a faulty will be a lifetime faulty',
  footerNote2: 'Editing this order before payment = Order Cancelled',
  footerSignature: '-Butter Meal',
};