// src/contexts/TenantContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "../services/supabase.client";
import { supabaseService } from "../services/supabase.service";
import { authService } from "../services/auth.service";
import { planService } from "../services/plan.service";
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
  StoreCategory,
} from "../types";
import { getCategoryLabel, getCategoryDef } from "../data/storeCategories";

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
  avatarUrl?: string;
  gstPercent?: number;
  packingCharge?: number;
  upiId?: string;
  dineinEnabled?: boolean;
  messageTemplate?: MessageTemplate;
  reviewsEnabled?: boolean;
  createdAt?: string;
  planId?: string;
  planName?: string;
  planFeatures?: PlanFeatures;
  planActive?: boolean;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionStartedAt?: string;
  subscriptionExpiresAt?: string;
  pauseRequested?: boolean;
  pauseRequestedAt?: string;
  daysUntilExpiry?: number;
  staffTippingEnabled?: boolean;
  infoDefaults?: Partial<
    Record<
      | "displayName"
      | "whatsappPhone"
      | "bannerUrl"
      | "storeTagline"
      | "deliveryCharge"
      | "storewideDiscount"
      | "ownerPhone"
      | "gstPercent"
      | "packingCharge"
      | "upiId",
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

const SLUG_STORAGE_KEY = "restaurant_tenant_slug";
const ADMIN_SUFFIX = "_admin";
const SMART_ADMIN_FLAG = "_smart-admin";

const resolveSlugFromUrl = (): { slug: string | null; isAdminView: boolean } => {
  try {
    const params = new URLSearchParams(window.location.search);
    const qp = params.get("t");
    if (!qp) {
      try {
        sessionStorage.removeItem(SLUG_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return { slug: null, isAdminView: false };
    }
    const raw = qp.trim();
    const isAdminView = raw.endsWith(ADMIN_SUFFIX);
    const slug = isAdminView ? raw.slice(0, -ADMIN_SUFFIX.length) : raw;
    if (!slug) {
      try {
        sessionStorage.removeItem(SLUG_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return { slug: null, isAdminView: false };
    }
    try {
      sessionStorage.setItem(SLUG_STORAGE_KEY, slug);
    } catch {
      /* ignore */
    }
    return { slug, isAdminView };
  } catch {
    return { slug: null, isAdminView: false };
  }
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

const normalizeStoredBadges = (raw: any): BadgeDefinition[] => {
  if (!Array.isArray(raw)) {
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
      removable: b.removable !== false,
    });
  });
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
      typeof stored.badgesLabel === "string" && stored.badgesLabel
        ? stored.badgesLabel
        : DEFAULT_FORM_SCHEMA.badgesLabel,
  };
};

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

let plansCache: Record<string, any> | null = null;

const loadPlansMap = async (): Promise<Record<string, any>> => {
  if (plansCache) return plansCache;
  if (!supabase) return {};
  try {
    const fetchPromise = supabase
      .from("star_veg_plans")
      .select("id, name, features, is_active")
      .then(({ data }) => data ?? null);
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 3000),
    );
    const data = await Promise.race([fetchPromise, timeoutPromise]);
    const map: Record<string, any> = {};
    (data || []).forEach((p: any) => {
      map[p.id] = { ...p, is_active: p.is_active !== false };
    });
    plansCache = map;
    return map;
  } catch (err) {
    console.warn("[loadPlansMap] failed:", err);
    plansCache = {};
    return {};
  }
};

planService.subscribeToPlanChanges(() => {
  plansCache = null;
});

const FOOD_DEFAULT_LABELS: Record<string, string> = {
  desc: "Description",
  ingredients: "Ingredients",
  nutritionalInfo: "Nutritional Information",
  preparationTime: "Preparation Time",
  calories: "Calories",
  isSpicy: "Spicy",
  isGlutenFree: "Gluten Free",
};

const FOOD_NUTRITION_HEADINGS = ["Protein", "Carbs", "Fat", "Fiber"];

const applyCategoryOverrides = (
  formSchema: FormSchema,
  category: StoreCategory | undefined,
): FormSchema => {
  const def = getCategoryDef(category);
  if (!def) return formSchema;

  const disabledSet = new Set(def.disabledFields ?? []);

  const shapedFields = formSchema.fields.map((f) => {
    const disabledByCategory = disabledSet.has(f.key);
    const labelOverride = def.fieldLabels?.[f.key];

    const currentLabel = (f.label ?? "").trim();
    const foodDefaultLabel = FOOD_DEFAULT_LABELS[f.key] ?? "";
    const isDefaultLabel =
      !currentLabel || currentLabel === foodDefaultLabel;

    let shapedOptions = f.options;

    if (
      f.key === "nutritionalInfo" &&
      Array.isArray(def.nutritionalHeadings) &&
      def.nutritionalHeadings.length > 0
    ) {
      const currentNames = (f.options ?? []).map((o) =>
        typeof o === "string" ? o : o.name,
      );
      const isFoodDefaults =
        currentNames.length === 0 ||
        currentNames.every((n) => FOOD_NUTRITION_HEADINGS.includes(n));

      if (isFoodDefaults) {
        shapedOptions = def.nutritionalHeadings.map((h) =>
          typeof h === "string"
            ? { name: h, value: "" }
            : { name: h.name, value: h.value ?? "" },
        );
      }
    }

    return {
      ...f,
      enabled: disabledByCategory ? false : f.enabled,
      label:
        labelOverride && labelOverride.trim() && isDefaultLabel
          ? labelOverride
          : f.label,
      options: shapedOptions,
    };
  });

  const shapedBadges = (formSchema.badges ?? []).map((b) => {
    const override = def.badgeLabels?.[b.key];
    return override && override.trim()
      ? { ...b, label: override }
      : b;
  });

  return {
    ...formSchema,
    fields: shapedFields,
    badges: shapedBadges,
  };
};

const buildTenant = (
  row: any,
  formSchema: FormSchema,
  infoDefaults: Tenant["infoDefaults"],
  effectiveReviews: boolean,
  planRow: any | null,
): Tenant => {
  const category: StoreCategory | undefined = (row.store_category ??
    "food-beverage") as StoreCategory;

  const shapedSchema = applyCategoryOverrides(formSchema, category);

  const expiresAt = row.subscription_expires_at;
  const days = expiresAt
    ? Math.ceil(
        (new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      )
    : Infinity;
  const planActive = planRow !== null && planRow.is_active !== false;
  const planFeatures: PlanFeatures =
    (planRow?.features ?? {}) as PlanFeatures;
  if (!planActive) {
    (planFeatures as any).isActive = false;
  }

  return {
    id: row.id,
    slug: row.slug,
    gstPercent: pickNumber(row.gst_percent, 0),
    packingCharge: pickNumber(row.packing_charge, 0),
    upiId: isBlank(row.upi_id) ? undefined : String(row.upi_id),
    dineinEnabled:
      category === "food-beverage" && row.dinein_enabled === true,
    staffTippingEnabled:
      category === "food-beverage" &&
      row.dinein_enabled === true &&
      row.staff_tipping_enabled === true,
    displayName: pickString(row.display_name, ShopInfo.Shop_name),
    storeCategory: category,
    whatsappPhone: pickString(row.whatsapp_phone, ShopInfo.Store_whatsapp),
    bannerUrl: isBlank(row.banner_url)
      ? ShopInfo.Shop_banner || undefined
      : String(row.banner_url),
    avatarUrl: isBlank(row.avatar_url) ? undefined : String(row.avatar_url),
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
    formSchema: shapedSchema,
    messageTemplate: normalizeMessageTemplate(row.message_template),
    reviewsEnabled: effectiveReviews,
    infoDefaults,
    planId: row.plan_id ?? "professional",
    planName: planRow?.name ?? "Professional",
    planFeatures,
    planActive,
    subscriptionStatus: (row.subscription_status ??
      "active") as SubscriptionStatus,
    subscriptionStartedAt: row.subscription_started_at ?? undefined,
    subscriptionExpiresAt: row.subscription_expires_at ?? undefined,
    pauseRequested: row.pause_requested === true,
    pauseRequestedAt: row.pause_requested_at ?? undefined,
    daysUntilExpiry: days,
  };
};

const fetchTenantBySlug = async (
  slug: string,
  signal?: AbortSignal,
): Promise<Tenant | null> => {
  if (!supabase) return null;

  const timeoutHandle: { timer: number | null } = { timer: null };
  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutHandle.timer = window.setTimeout(() => resolve(null), 6000);
  });

  const fetchPromise = (async (): Promise<Tenant | null> => {
    try {
      const [tenantRes, mainRes] = await Promise.all([
        supabase
          .from("star_veg_tenants")
          .select(
            "id, slug, display_name, is_active, whatsapp_phone, owner_phone, form_schema, banner_url, store_tagline, delivery_charge, storewide_discount, message_template, reviews_enabled, plan_id, subscription_status, subscription_started_at, subscription_expires_at, pause_requested, pause_requested_at, store_category, gst_percent, packing_charge, upi_id, dinein_enabled, staff_tipping_enabled, avatar_url",
          )
          .eq("slug", slug)
          .maybeSingle(),
        supabase
          .from("star_veg_tenants")
          .select("reviews_enabled")
          .eq("slug", "main")
          .maybeSingle(),
      ]);

      if (signal?.aborted) return null;

      const data = tenantRes.data;
      if (tenantRes.error || !data) {
        console.warn(
          "[fetchTenant] tenant lookup failed:",
          tenantRes.error?.message ?? "no data",
        );
        return null;
      }

      const infoDefaults = {
        displayName: isBlank(data.display_name),
        whatsappPhone: isBlank(data.whatsapp_phone),
        bannerUrl: isBlank(data.banner_url),
        storeTagline: isBlank(data.store_tagline),
        deliveryCharge: isBlankNum(data.delivery_charge),
        storewideDiscount: isBlankNum(data.storewide_discount),
        ownerPhone: isBlank(data.owner_phone),
        gstPercent:
          isBlankNum(data.gst_percent) || Number(data.gst_percent) === 0,
        packingCharge:
          isBlankNum(data.packing_charge) || Number(data.packing_charge) === 0,
        upiId: isBlank(data.upi_id),
      };

      const globalOn = mainRes.data?.reviews_enabled !== false;
      const tenantOn = data.reviews_enabled !== false;
      const effectiveReviews = globalOn && tenantOn;

      const plansMap = await loadPlansMap();
      if (signal?.aborted) return null;
      const planRow = plansMap[data.plan_id] ?? null;

      const formSchema = normalizeFormSchema(data.form_schema);
      const categoryField = formSchema.fields.find(
        (f) => f.key === "category",
      );
      const catOptions = categoryField?.options ?? [];

      if (catOptions.length === 0) {
        void (async () => {
          try {
            const { data: itemRows } = await supabase
              .from("star_veg_menu_items")
              .select("category")
              .eq("tenant_id", data.id);
            if (!itemRows || itemRows.length === 0) return;
            const seen = new Set<string>();
            itemRows.forEach((r: any) => {
              const c = (r.category ?? "").trim();
              if (c) seen.add(c);
            });
            if (seen.size === 0) return;
            const merged = Array.from(seen).sort((a, b) =>
              a.localeCompare(b),
            );
            const seeded: FormSchema = {
              ...formSchema,
              fields: formSchema.fields.map((f) =>
                f.key === "category" ? { ...f, options: merged } : f,
              ),
            };
            await supabaseService.updateFormSchema(slug, seeded);
          } catch (err) {
            console.warn("[fetchTenant] category seed failed:", err);
          }
        })();
      }

      return buildTenant(
        data,
        formSchema,
        infoDefaults,
        effectiveReviews,
        planRow,
      );
    } catch (err) {
      console.warn("[fetchTenant] threw:", err);
      return null;
    }
  })();

  try {
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    return result;
  } finally {
    if (timeoutHandle.timer !== null) {
      window.clearTimeout(timeoutHandle.timer);
      timeoutHandle.timer = null;
    }
  }
};

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

  const tenantRef = useRef<Tenant | null>(null);
  useEffect(() => {
    tenantRef.current = tenant;
  }, [tenant]);

  const inFlightRef = useRef<Promise<Tenant | null> | null>(null);

  const doFetch = useCallback(async (slug: string): Promise<Tenant | null> => {
    if (inFlightRef.current) return inFlightRef.current;
    const p = fetchTenantBySlug(slug).finally(() => {
      inFlightRef.current = null;
    });
    inFlightRef.current = p;
    return p;
  }, []);

  const applyTenant = useCallback((resolved: Tenant | null) => {
    if (!resolved) {
      setTenant(null);
      setIsDeactivated(false);
      setTenantNotFound(true);
      setIsLoading(false);
      return;
    }
    tenantRef.current = resolved;
    setTenant(resolved);
    setIsDeactivated(resolved.isActive === false);
    setTenantNotFound(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const smartAdmin = isSmartAdminUrl();
    setIsSmartAdminHost(smartAdmin);

    const { slug, isAdminView: adminView } = resolveSlugFromUrl();
    setIsAdminView(adminView);

    if (!slug) {
      setIsAdminHost(true);
      setTenant(null);
      setTenantNotFound(false);
      setIsDeactivated(false);
      setIsLoading(false);
      authService.enforceTenantScope(null, false, smartAdmin);
      return;
    }

    setIsAdminHost(false);
    let cancelled = false;

    const loadOnce = async () => {
      if (cancelled) return;
      setIsLoading(true);
      setTenantNotFound(false);
      const resolved = await doFetch(slug);
      if (cancelled) return;
      applyTenant(resolved);
      authService.enforceTenantScope(
        resolved?.slug ?? slug,
        adminView,
        smartAdmin,
      );
    };

    if (!adminView) {
      void loadOnce();
      return () => {
        cancelled = true;
      };
    }

    const authState = authService.getState();

    if (!authState.isLoading) {
      if (authState.isAuthenticated) {
        void loadOnce();
      } else {
        setTenant(null);
        setIsDeactivated(false);
        setTenantNotFound(false);
        setIsLoading(false);
        authService.enforceTenantScope(slug, adminView, smartAdmin);
      }
    } else {
      setTenant(null);
      setTenantNotFound(false);
    }

    let wasAuthenticated = authService.getState().isAuthenticated;
    const unsubscribe = authService.subscribe((state) => {
      if (cancelled) return;

      if (!wasAuthenticated && state.isAuthenticated) {
        void loadOnce();
      } else if (wasAuthenticated && !state.isAuthenticated) {
        setTenant(null);
        tenantRef.current = null;
        setIsDeactivated(false);
        setTenantNotFound(false);
        setIsLoading(false);
      }
      wasAuthenticated = state.isAuthenticated;
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!supabase) return;
    Promise.resolve(supabase.rpc("expire_stale_subscriptions")).catch(() => {
      /* ignore */
    });
  }, []);

  useEffect(() => {
    const unsubscribe = planService.subscribeToPlanChanges(() => {
      const { slug } = resolveSlugFromUrl();
      if (slug && tenantRef.current) {
        void doFetch(slug).then((resolved) => {
          if (resolved) applyTenant(resolved);
        });
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshTenant = useCallback(
    async (opts?: { expectBanner?: string }) => {
      const { slug } = resolveSlugFromUrl();
      if (!slug) return;
      setIsLoading(true);
      let fresh: Tenant | null = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        fresh = await doFetch(slug);
        if (fresh && opts?.expectBanner) {
          if (fresh.bannerUrl === opts.expectBanner) break;
          fresh = null;
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }
        if (fresh) break;
        await new Promise((r) => setTimeout(r, 300));
      }
      applyTenant(fresh);
    },
    [doFetch, applyTenant],
  );

  const lastFocusRefreshRef = useRef(0);
  useEffect(() => {
    const { slug } = resolveSlugFromUrl();
    if (!slug) return;
    const onFocus = () => {
      if (document.hidden) return;
      const now = Date.now();
      if (now - lastFocusRefreshRef.current < 15_000) return;
      lastFocusRefreshRef.current = now;
      const { slug: s } = resolveSlugFromUrl();
      if (s) {
        void doFetch(s).then((resolved) => {
          if (resolved) applyTenant(resolved);
        });
      }
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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