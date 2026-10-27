// src/types/index.ts

// =========================================================
// USERS
// =========================================================

export interface User {
  id: string;
  phone: string;
  name: string;
  password: string;
  role: "admin" | "user";
  isActive: boolean;
  tenantId?: string;
  tenantSlug?: string;
  createdAt: string;
  lastLogin?: string;
  isPlatformAdmin?: boolean;
}

// =========================================================
// STORE CATEGORY
// =========================================================
export type StoreCategory =
  | "food-beverage"
  | "fashion-lifestyle"
  | "home-living"
  | "books-office"
  | "services-events"
  | "hospital-pharmacy"
  | "other-shops";

// =========================================================
// STORE SETTINGS
// =========================================================

export interface StoreSettings {
  isOpen: boolean;
  closedMessage: string;
  expectedOpenDate: string;
  expectedOpenTime: string;
  acceptingOrders: boolean;
  lastUpdated: string;
}

// =========================================================
// MENU - CUSTOMIZATION
// =========================================================

export interface CustomizationChoice {
  name: string;
  price: number;
}

export interface CustomizationOption {
  name: string;
  choices: CustomizationChoice[];
  default?: string;
}

// =========================================================
// MENU - FORM SCHEMA
// =========================================================

export type FormFieldType =
  | "text"
  | "number"
  | "textarea"
  | "checkbox"
  | "select";

export interface FormFieldOption {
  name: string;
  value?: string;
}

export interface FormFieldConfig {
  key: string;
  label: string;
  type: FormFieldType;
  enabled: boolean;
  builtin: boolean;
  removable: boolean;
  locked?: boolean;
  platformOnly?: boolean;
  options?: Array<string | FormFieldOption>;
  image?: string;
}

export interface BadgeDefinition {
  key: string;
  label: string;
  enabled: boolean;
  image?: string;
  removable: boolean;
}

export interface FormSchema {
  fields: FormFieldConfig[];
  badges?: BadgeDefinition[];
  badgesLabel?: string;
}

export const normalizeOptions = (
  options: Array<string | FormFieldOption> | undefined,
): FormFieldOption[] =>
  (options ?? []).map((o) =>
    typeof o === "string" ? { name: o } : o,
  );

export const DEFAULT_FORM_SCHEMA: FormSchema = {
  fields: [
    {
      key: "name",
      label: "Name",
      type: "text",
      enabled: true,
      builtin: true,
      removable: false,
      locked: true,
    },
    {
      key: "img",
      label: "Image",
      type: "text",
      enabled: true,
      builtin: true,
      removable: false,
      locked: true,
    },
    {
      key: "price",
      label: "Price",
      type: "number",
      enabled: true,
      builtin: true,
      removable: false,
      locked: true,
    },
    {
      key: "discount",
      label: "Discount (%)",
      type: "number",
      enabled: true,
      builtin: true,
      removable: false,
      locked: true,
    },
    {
      key: "desc",
      label: "Description",
      type: "textarea",
      enabled: true,
      builtin: true,
      removable: false,
      locked: true,
    },
    {
      key: "costPrice",
      label: "Cost Price",
      type: "number",
      enabled: true,
      builtin: true,
      removable: false,
      locked: true,
    },
    {
      key: "rating",
      label: "Rating",
      type: "number",
      enabled: true,
      builtin: true,
      removable: false,
      locked: true,
      platformOnly: true,
    },
    {
      key: "reviewCount",
      label: "Review Count",
      type: "number",
      enabled: true,
      builtin: true,
      removable: false,
      locked: true,
      platformOnly: true,
    },
    {
      key: "inStock",
      label: "In Stock",
      type: "checkbox",
      enabled: true,
      builtin: true,
      removable: false,
      locked: true,
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      enabled: true,
      builtin: true,
      removable: false,
      options: [],
    },
    {
      key: "preparationTime",
      label: "Preparation Time",
      type: "text",
      enabled: true,
      builtin: true,
      removable: false,
    },
    {
      key: "calories",
      label: "Calories",
      type: "number",
      enabled: true,
      builtin: true,
      removable: false,
    },
    {
      key: "ingredients",
      label: "Ingredients",
      type: "text",
      enabled: true,
      builtin: true,
      removable: false,
    },
    {
      key: "isVeg",
      label: "Vegetarian",
      type: "checkbox",
      enabled: true,
      builtin: true,
      removable: false,
    },
    {
      key: "isSpicy",
      label: "Spicy",
      type: "checkbox",
      enabled: true,
      builtin: true,
      removable: false,
    },
    {
      key: "isGlutenFree",
      label: "Gluten Free",
      type: "checkbox",
      enabled: true,
      builtin: true,
      removable: false,
    },
    {
      key: "nutritionalInfo",
      label: "Nutritional Information",
      type: "text",
      enabled: true,
      builtin: true,
      removable: false,
      options: [
        { name: "Protein", value: "e.g. 12g" },
        { name: "Carbs", value: "e.g. 30g" },
        { name: "Fat", value: "e.g. 8g" },
        { name: "Fiber", value: "e.g. 5g" },
      ],
    },
  ],
  badges: [
    {
      key: "isPopular",
      label: "Popular",
      enabled: true,
      removable: true,
    },
    { key: "isNew", label: "New", enabled: true, removable: true },
    {
      key: "isChefSpecial",
      label: "Chef's Special",
      enabled: true,
      removable: true,
    },
    {
      key: "isLimited",
      label: "Limited",
      enabled: true,
      removable: true,
    },
  ],
  badgesLabel: "Badges",
};

// =========================================================
// MENU - ITEMS
// =========================================================

export type MenuItemAttributes = {
  isPopular?: boolean;
  isNew?: boolean;
  isChefSpecial?: boolean;
  isLimited?: boolean;
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
    [key: string]: string | undefined;
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

export type PaymentMode = "COD" | "Online";
export type DeliveryType = "now" | "schedule";

// =========================================================
// AUTH
// =========================================================

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// =========================================================
// WHATSAPP MESSAGE TEMPLATE
// =========================================================

export interface MessageTemplate {
  orderLabel: string;
  namePrompt: string;
  namePromptPlaceholder: string;

  itemListTitle: string;
  itemLineTemplate: string;
  showItemDiscount: boolean;
  showItemAddons: boolean;
  showItemCustomizations: boolean;
  showItemNotes: boolean;

  subtotalLabel: string;
  deliveryLabel: string;
  discountLabel: string;
  totalLabel: string;
  freeDeliveryLabel: string;

  footerNote1: string;
  footerNote2: string;
  footerSignature: string;
}

export const DEFAULT_MESSAGE_TEMPLATE: MessageTemplate = {
  orderLabel: "New Order From {customerName}",
  namePrompt: "Please enter your name",
  namePromptPlaceholder: "e.g., Anmol",

  itemListTitle: "Item List",
  itemLineTemplate: "{name} x {qty}",
  showItemDiscount: true,
  showItemAddons: true,
  showItemCustomizations: true,
  showItemNotes: true,

  subtotalLabel: "Subtotal",
  deliveryLabel: "Delivery",
  discountLabel: "Discount",
  totalLabel: "Total Amount",
  freeDeliveryLabel: "(+Rs {fee} Inc. for delivery)",

  footerNote1:
    "We take orders on trust. Once a faulty will be a lifetime faulty",
  footerNote2: "Editing this order before payment = Order Cancelled",
  footerSignature: "-Butter Meal",
};

// =========================================================
// TENANT
// =========================================================

export interface Tenant {
  id: string;
  slug: string;
  displayName: string;
  whatsappPhone?: string;
  isActive?: boolean;
  formSchema?: FormSchema;
  storeCategory?: StoreCategory;
  gstPercent?: number;
  packingCharge?: number;
  bannerUrl?: string;
  storeTagline?: string;
  deliveryCharge?: number;
  storewideDiscount?: number;
  ownerPhone?: string;
  messageTemplate?: MessageTemplate;
  reviewsEnabled?: boolean;
  infoDefaults?: Partial<
    Record<
      | "displayName"
      | "whatsappPhone"
      | "bannerUrl"
      | "storeTagline"
      | "deliveryCharge"
      | "storewideDiscount"
      | "ownerPhone",
      boolean
    >
  >;
  planId?: string;
  planName?: string;
  planFeatures?: PlanFeatures;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionStartedAt?: string;
  subscriptionExpiresAt?: string;
  pauseRequested?: boolean;
  pauseRequestedAt?: string;
  daysUntilExpiry?: number;
  dineinEnabled?: boolean;
  upiId?: string;
  avatarUrl?: string;
}

// =========================================================
// REVIEWS
// =========================================================

export interface Review {
  id: string;
  itemId: number;
  itemName: string;
  itemCategory: string;
  rating: number;
  comment: string;
  customerName: string;
  deviceId: string;
  deviceFingerprint: string;
  createdAt: string;
}

export type ReviewFilter =
  | "all"
  | "lte4"
  | "lte3"
  | "lte2"
  | "commented";

// =========================================================
// PLANS / SUBSCRIPTION
// =========================================================

export interface PlanFeatures {
  canOrder?: boolean;
  canEditFields?: boolean;
  canManageStore?: boolean;
  canManageUsers?: boolean;
  canWishlist?: boolean;
  canReview?: boolean;
  canAddCustomMessage?: boolean;
  canEditProfileFields?: string[];
  [key: string]: any;
}

export interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  description: string;
  features: PlanFeatures;
  isActive: boolean;
  sortOrder: number;
}

export type DurationMonths = 1 | 3 | 6 | 12 | 24;

export interface DurationOption {
  months: DurationMonths;
  discountPct: number;
  label: string;
}

export const DURATION_OPTIONS: DurationOption[] = [
  { months: 1, discountPct: 0, label: "1 month" },
  { months: 3, discountPct: 10, label: "3 months" },
  { months: 6, discountPct: 15, label: "6 months" },
  { months: 12, discountPct: 20, label: "1 year" },
  { months: 24, discountPct: 25, label: "2 years" },
];

export type SubscriptionStatus = "active" | "paused" | "expired";

export interface Invoice {
  id: string;
  tenantSlug: string;
  planId: string;
  months: number;
  baseAmount: number;
  discountPct: number;
  finalAmount: number;
  taxPercent?: number;
  taxAmount?: number;
  status: "pending" | "paid" | "cancelled";
  paidAt?: string;
  markedPaidBy?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  notes?: string;
  createdAt: string;
}

export interface PauseRequest {
  id: string;
  tenantSlug: string;
  tenantName?: string;
  requestedAt: string;
  status: "pending" | "accepted" | "rejected";
  resolvedAt?: string;
  resolvedBy?: string;
}

// =========================================================
// DINE-IN
// =========================================================
export interface DineinTable {
  id: string;
  tenantSlug: string;
  label: string;
  labelKind: "number" | "name";
  deviceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DineinOrderItem {
  itemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  addons: number;
  discountPct: number;
  customizations?: Record<string, string>;
  customMessage?: string;
  lineTotal: number;
  served?: boolean;
}

export type DineinStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "served"
  | "bill_requested"
  | "paid"
  | "cancelled";

export interface DineinOrder {
  id: string;
  orderNo: string;
  tenantSlug: string;
  tableId: string;
  tableLabel: string;
  tableLabelKind: "number" | "name";
  customerName: string;
  deviceId: string | null;
  items: DineinOrderItem[];
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  packingCharge: number;
  storewideDiscount: number;
  totalAmount: number;
  status: DineinStatus;
  billRequested: boolean;
  billRequestedAt?: string;
  payOnline: boolean;
  payOnlineRequested?: boolean;
  paidAt?: string;
  paymentRef?: string;
  sessionClosed?: boolean;
  closedAt?: string;
  acceptedAt?: string;
  preparingAt?: string;
  servedAt?: string;
  createdAt: string;
  updatedAt: string;
  settledOfflineAfterFailure?: boolean;
  customerPaidClaimed?: boolean;
  customerPaidClaimedAt?: string;
  staffTip?: number;
}

export interface DineinEvent {
  id: string;
  orderId: string;
  tableLabel: string;
  kind: "order" | "bill_request" | "rating";
  payload?: Record<string, any>;
  createdAt: string;
  readAt?: string | null;
}

// =========================================================
// HOSPITAL / PHARMACY
// =========================================================

export interface MedicineStock {
  id: string;
  name: string;
  composition?: string;
  manufacturer?: string;
  hsnCode?: string;
  packSize?: string;
  batchNo?: string;
  expiryDate?: string;
  mrp: number;
  price: number;
  stockQty: number;
}

export interface PharmacyBillItem {
  medicineId?: string;
  name: string;
  hsnCode: string;
  packSize: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  mrp: number;
  discountPercent: number;
  price: number;
  amount: number;
}

export interface PharmacyBill {
  id?: string;
  billNo: string;
  patientName: string;
  phone: string;
  address: string;
  doctorName: string;
  items: PharmacyBillItem[];
  subtotal: number;
  discount: number;
  finalAmount: number;
  createdAt?: string;
}