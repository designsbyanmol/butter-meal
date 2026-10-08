// src/contexts/TenantContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase.client";
import { supabaseService } from "../services/supabase.service";
import { authService } from "../services/auth.service";
import { ShopInfo } from "../config/credentials";
import {
  FormSchema,
  FormFieldConfig,
  FormFieldOption,
  BadgeDefinition,
  DEFAULT_FORM_SCHEMA,
  MessageTemplate,
  DEFAULT_MESSAGE_TEMPLATE,
  PlanFeatures,
  SubscriptionStatus,
  StoreCategory
} from "../types";
import { getCategoryLabel } from '../data/storeCategories';

// =========================================================
// Tenant shape
// =========================================================
export interface Tenant {
  id: string;
  slug: string;
  displayName: string;
  whatsappPhone?: string;
  isActive?: boolean;
  formSchema?: FormSchema;
storeCategory?: StoreCategory;
  bannerUrl?: string;
  storeTagline?: string;
  deliveryCharge?: number;
  storewideDiscount?: number;
  ownerPhone?: string;

  messageTemplate?: MessageTemplate;

  reviewsEnabled?: boolean;

  planId?: string;
  planName?: string;
  planFeatures?: PlanFeatures;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionStartedAt?: string;
  subscriptionExpiresAt?: string;
  pauseRequested?: boolean;
  pauseRequestedAt?: string;
  daysUntilExpiry?: number;

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
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  isAdminHost: boolean;
  isSmartAdminHost: boolean;
  isDeactivated: boolean;
  tenantNotFound: boolean;
  isAdminView: boolean;
  refreshTenant: (opts?: { expectBanner?: string }) => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isLoading: true,
  isAdminHost: false,
  isSmartAdminHost: false,
  isDeactivated: false,
  tenantNotFound: false,
  isAdminView: false,
  refreshTenant: async () => {},
});

export const useTenant = () => useContext(TenantContext);

// =========================================================
// URL parsing
// =========================================================
const SLUG_STORAGE_KEY = "restaurant_tenant_slug";
const ADMIN_SUFFIX = "_admin";
const SMART_ADMIN_FLAG = "_smart-admin";

interface ResolvedSlug {
  slug: string | null;
  isAdminView: boolean;
}

const resolveSlugFromUrl = (): ResolvedSlug => {
  const params = new URLSearchParams(window.location.search);
  const qp = params.get("t");

  if (!qp) {
    sessionStorage.removeItem(SLUG_STORAGE_KEY);
    return { slug: null, isAdminView: false };
  }

  const raw = qp.trim();
  const isAdminView = raw.endsWith(ADMIN_SUFFIX);
  const slug = isAdminView ? raw.slice(0, -ADMIN_SUFFIX.length) : raw;

  if (!slug) {
    sessionStorage.removeItem(SLUG_STORAGE_KEY);
    return { slug: null, isAdminView: false };
  }

  sessionStorage.setItem(SLUG_STORAGE_KEY, slug);
  return { slug, isAdminView };
};

const isSmartAdminUrl = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    return url.searchParams.has(SMART_ADMIN_FLAG);
  } catch {
    return false;
  }
};

// =========================================================
// Form schema normalization
// =========================================================

/** Normalize a stored options array (strings OR objects) to a stable shape. */
const normalizeStoredOptions = (
  raw: any,
): Array<string | FormFieldOption> | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const out: Array<string | FormFieldOption> = [];
  raw.forEach((o) => {
    if (typeof o === "string") {
      out.push(o);
    } else if (o && typeof o === "object" && typeof o.name === "string") {
      out.push({
        name: o.name,
        ...(typeof o.value === "string" ? { value: o.value } : {}),
      });
    }
  });
  return out.length > 0 ? out : undefined;
};

/** Normalize a stored badges array. */
const normalizeStoredBadges = (raw: any): BadgeDefinition[] => {
  if (!Array.isArray(raw)) {
    // First-ever load - seed the defaults
    return DEFAULT_FORM_SCHEMA.badges ?? [];
  }

  const defaults = DEFAULT_FORM_SCHEMA.badges ?? [];
  const defaultByKey = new Map(defaults.map((b) => [b.key, b]));

  const out: BadgeDefinition[] = [];
  raw.forEach((b) => {
    if (!b || typeof b !== "object" || typeof b.key !== "string") return;
    const def = defaultByKey.get(b.key);
    out.push({
      key: b.key,
      label:
        typeof b.label === "string" && b.label
          ? b.label
          : (def?.label ?? b.key),
      enabled: b.enabled !== false,
      image: typeof b.image === "string" && b.image ? b.image : undefined,
      removable: b.removable !== false, // default true now
    });
  });

  // NOTE: Do NOT re-add missing built-in badges - the owner may have
  // intentionally deleted them. Only the very first load (empty array
  // is treated as "never configured" - seed defaults). An existing
  // array that's missing a badge key means it was deleted on purpose.
  return out;
};

const normalizeFormSchema = (stored: any): FormSchema => {
  if (!stored || !Array.isArray(stored.fields)) {
    return DEFAULT_FORM_SCHEMA;
  }

  const defaultsByKey = new Map(
    DEFAULT_FORM_SCHEMA.fields.map((f) => [f.key, f]),
  );

  const merged: FormFieldConfig[] = stored.fields
    .map((storedField: any) => {
      if (!storedField || typeof storedField !== "object") return null;
      if (typeof storedField.key !== "string" || storedField.key === "") {
        return null;
      }

      const def = defaultsByKey.get(storedField.key);

      if (def) {
        const storedOptions = normalizeStoredOptions(storedField.options);
        const defOptions = normalizeStoredOptions(def.options);
        // Use stored options if they exist and are non-empty; else fall back to
        // the default options (e.g. seeded nutrition headings).
        const options =
          storedOptions && storedOptions.length > 0
            ? storedOptions
            : defOptions;

        return {
          ...def,
          enabled: storedField.enabled ?? def.enabled,
          label: storedField.label || def.label,
          options,
          image:
            typeof storedField.image === "string" && storedField.image
              ? storedField.image
              : undefined,
        };
      }

      return {
        key: storedField.key,
        label: storedField.label || storedField.key,
        type: storedField.type || "text",
        enabled: storedField.enabled ?? true,
        builtin: false,
        removable: true,
        options: normalizeStoredOptions(storedField.options),
        image:
          typeof storedField.image === "string" && storedField.image
            ? storedField.image
            : undefined,
      } as FormFieldConfig;
    })
    .filter(Boolean) as FormFieldConfig[];

  const presentKeys = new Set(merged.map((f) => f.key));
  DEFAULT_FORM_SCHEMA.fields.forEach((def) => {
    if (!presentKeys.has(def.key)) {
      merged.push({ ...def });
    }
  });

  return {
    fields: merged,
    badges: normalizeStoredBadges(stored.badges),
    badgesLabel:
      typeof stored.badgesLabel === 'string' && stored.badgesLabel
        ? stored.badgesLabel
        : DEFAULT_FORM_SCHEMA.badgesLabel,
  };
};

// =========================================================
// Message template normalization
// =========================================================
const normalizeMessageTemplate = (raw: any): MessageTemplate => {
  if (!raw || typeof raw !== "object") return DEFAULT_MESSAGE_TEMPLATE;
  return {
    ...DEFAULT_MESSAGE_TEMPLATE,
    ...raw,
    showItemDiscount: !!raw.showItemDiscount,
    showItemAddons: !!raw.showItemAddons,
    showItemCustomizations: !!raw.showItemCustomizations,
    showItemNotes: !!raw.showItemNotes,
  };
};

// =========================================================
// ShopInfo fallback helpers
// =========================================================
const isBlank = (v: any): boolean =>
  v === null || v === undefined || String(v).trim() === "";

const isBlankNum = (v: any): boolean =>
  v === null || v === undefined || v === "";

const pickString = (v: any, fallback: string): string =>
  isBlank(v) ? fallback : String(v);

const pickNumber = (v: any, fallback: number): number => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// =========================================================
// Plan cache
// =========================================================
let plansCache: Record<string, any> | null = null;

const loadPlansMap = async (): Promise<Record<string, any>> => {
  if (plansCache) return plansCache;
  if (!supabase) return {};
  const { data } = await supabase
    .from("star_veg_plans")
    .select("id, name, features");
  const map: Record<string, any> = {};
  (data || []).forEach((p: any) => {
    map[p.id] = p;
  });
  plansCache = map;
  return map;
};

// =========================================================
// Build tenant object from a DB row
// =========================================================
const buildTenant = (
  row: any,
  formSchema: FormSchema,
  infoDefaults: Tenant["infoDefaults"],
  effectiveReviews: boolean,
  planRow: any | null,
): Tenant => {
  const expiresAt = row.subscription_expires_at;
  const days = expiresAt
    ? Math.ceil(
        (new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      )
    : Infinity;

  return {
    id: row.id,
    slug: row.slug,

    displayName: pickString(row.display_name, ShopInfo.Shop_name),
    storeCategory: (row.store_category ?? 'restaurant') as StoreCategory,
    whatsappPhone: pickString(row.whatsapp_phone, ShopInfo.Store_whatsapp),
    bannerUrl: isBlank(row.banner_url)
      ? ShopInfo.Shop_banner || undefined
      : String(row.banner_url),
    storeTagline: pickString(
  row.store_tagline,
  row.store_category
    ? getCategoryLabel(row.store_category as StoreCategory)
    : ShopInfo.Shop_tagline,
),
    deliveryCharge: pickNumber(row.delivery_charge, ShopInfo.Delivery_charge),
    storewideDiscount: pickNumber(
      row.storewide_discount,
      ShopInfo.Storewide_discount,
    ),
    ownerPhone: pickString(row.owner_phone, ShopInfo.Owner_phone),

    isActive: row.is_active,
    formSchema,
    messageTemplate: normalizeMessageTemplate(row.message_template),
    reviewsEnabled: effectiveReviews,
    infoDefaults,

    planId: row.plan_id ?? "professional",
    planName: planRow?.name ?? "Professional",
    planFeatures: (planRow?.features ?? {}) as PlanFeatures,
    subscriptionStatus: (row.subscription_status ??
      "active") as SubscriptionStatus,
    subscriptionStartedAt: row.subscription_started_at ?? undefined,
    subscriptionExpiresAt: row.subscription_expires_at ?? undefined,
    pauseRequested: row.pause_requested === true,
    pauseRequestedAt: row.pause_requested_at ?? undefined,
    daysUntilExpiry: days,
  };
};

// =========================================================
// Provider
// =========================================================
export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminHost, setIsAdminHost] = useState(false);
  const [isSmartAdminHost, setIsSmartAdminHost] = useState(false);
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [tenantNotFound, setTenantNotFound] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);

  const fetchTenant = async (slug: string): Promise<Tenant | null> => {
    if (!supabase) return null;

    const [tenantRes, mainRes] = await Promise.all([
      supabase
  .from('star_veg_tenants')
  .select(
    'id, slug, display_name, is_active, whatsapp_phone, owner_phone, form_schema, banner_url, store_tagline, delivery_charge, storewide_discount, message_template, reviews_enabled, plan_id, subscription_status, subscription_started_at, subscription_expires_at, pause_requested, pause_requested_at, store_category',
  )
        .eq("slug", slug)
        .maybeSingle(),
      supabase
        .from("star_veg_tenants")
        .select("reviews_enabled")
        .eq("slug", "main")
        .maybeSingle(),
    ]);

    const data = tenantRes.data;
    const error = tenantRes.error;
    if (error || !data) return null;

    const infoDefaults = {
      displayName: isBlank(data.display_name),
      whatsappPhone: isBlank(data.whatsapp_phone),
      bannerUrl: isBlank(data.banner_url),
      storeTagline: isBlank(data.store_tagline),
      deliveryCharge: isBlankNum(data.delivery_charge),
      storewideDiscount: isBlankNum(data.storewide_discount),
      ownerPhone: isBlank(data.owner_phone),
    };

    const globalOn = mainRes.data?.reviews_enabled !== false;
    const tenantOn = data.reviews_enabled !== false;
    const effectiveReviews = globalOn && tenantOn;

    const plansMap = await loadPlansMap();
    const planRow = plansMap[data.plan_id] ?? null;

    const formSchema = normalizeFormSchema(data.form_schema);
    const categoryField = formSchema.fields.find((f) => f.key === "category");

    // Seed categories from items if the schema has none
    const catOptions = categoryField?.options ?? [];
    const catOptionsEmpty = catOptions.length === 0;

    if (catOptionsEmpty) {
      try {
        const { data: itemRows } = await supabase
          .from("star_veg_menu_items")
          .select("category")
          .eq("tenant_id", data.id);

        if (itemRows && itemRows.length > 0) {
          const seen = new Set<string>();
          itemRows.forEach((r: any) => {
            const c = (r.category ?? "").trim();
            if (c) seen.add(c);
          });

          if (seen.size > 0) {
            const merged = Array.from(seen).sort((a, b) => a.localeCompare(b));
            const seeded: FormSchema = {
              ...formSchema,
              fields: formSchema.fields.map((f) =>
                f.key === "category" ? { ...f, options: merged } : f,
              ),
            };

            Promise.resolve(
              supabaseService.updateFormSchema(slug, seeded),
            ).catch((e) =>
              console.warn("Failed to persist seeded categories:", e),
            );

            return buildTenant(
              data,
              seeded,
              infoDefaults,
              effectiveReviews,
              planRow,
            );
          }
        }
      } catch (err) {
        console.warn("Failed to derive categories from items:", err);
      }
    }

    return buildTenant(
      data,
      formSchema,
      infoDefaults,
      effectiveReviews,
      planRow,
    );
  };

    const refreshTenant = async (opts?: { expectBanner?: string }) => {
    const { slug } = resolveSlugFromUrl();
    if (!slug) return;

    let fresh: Tenant | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      fresh = await fetchTenant(slug);

      if (fresh && opts?.expectBanner) {
        if (fresh.bannerUrl === opts.expectBanner) break;
        // Not yet propagated - wait and retry.
        fresh = null;
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }

      if (fresh) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    if (fresh) {
      setTenant(fresh);
      setIsDeactivated(fresh.isActive === false);
      setTenantNotFound(false);
    }
  };

  // Auto-expire stale subscriptions on mount
  useEffect(() => {
    if (!supabase) return;
    Promise.resolve(supabase.rpc("expire_stale_subscriptions")).catch(() => {
      /* ignore */
    });
  }, []);

  useEffect(() => {
    const smartAdmin = isSmartAdminUrl();
    setIsSmartAdminHost(smartAdmin);

    const { slug, isAdminView: adminView } = resolveSlugFromUrl();
    setIsAdminView(adminView);

    if (!slug) {
      setIsAdminHost(true);
      setTenantNotFound(false);
      setIsLoading(false);
      authService.enforceTenantScope(null, false, smartAdmin);
      return;
    }

    (async () => {
      if (!supabase) {
        console.warn("Supabase not configured - cannot resolve tenant");
        setTenant(null);
        setTenantNotFound(true);
        setIsLoading(false);
        authService.enforceTenantScope(null, false, smartAdmin);
        return;
      }

      const resolved = await fetchTenant(slug);

      if (!resolved) {
        console.warn("Tenant not found:", slug);
        setTenant(null);
        setIsDeactivated(false);
        setTenantNotFound(true);
        authService.enforceTenantScope(null, false, smartAdmin);
      } else {
        setTenant(resolved);
        setIsDeactivated(resolved.isActive === false);
        setTenantNotFound(false);
        authService.enforceTenantScope(resolved.slug, adminView, smartAdmin);
      }
      setIsLoading(false);
    })();
  }, []);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        isLoading,
        isAdminHost,
        isSmartAdminHost,
        isDeactivated,
        tenantNotFound,
        isAdminView,
        refreshTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};
