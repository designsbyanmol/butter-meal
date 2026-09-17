// contexts/TenantContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase.client';
import { supabaseService } from '../services/supabase.service';
import { authService } from '../services/auth.service';
import { ShopInfo } from '../config/credentials';
import {
  FormSchema,
  FormFieldConfig,
  DEFAULT_FORM_SCHEMA,
  MessageTemplate,
  DEFAULT_MESSAGE_TEMPLATE,
} from '../types';

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

  // Store info (resolved against ShopInfo fallback)
  bannerUrl?: string;
  storeTagline?: string;
  deliveryCharge?: number;
  storewideDiscount?: number;
  ownerPhone?: string;

  // WhatsApp message template
  messageTemplate?: MessageTemplate;

  /** Effective reviews flag: TRUE only when global + tenant are both on. */
  reviewsEnabled?: boolean;

  /** Field → true if the current value came from ShopInfo, not the DB. */
  infoDefaults?: Partial<
    Record<
      | 'displayName'
      | 'whatsappPhone'
      | 'bannerUrl'
      | 'storeTagline'
      | 'deliveryCharge'
      | 'storewideDiscount'
      | 'ownerPhone',
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
  refreshTenant: () => Promise<void>;
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
const SLUG_STORAGE_KEY = 'restaurant_tenant_slug';
const ADMIN_SUFFIX = '_admin';
const SMART_ADMIN_FLAG = '_smart-admin';

interface ResolvedSlug {
  slug: string | null;
  isAdminView: boolean;
}

const resolveSlugFromUrl = (): ResolvedSlug => {
  const params = new URLSearchParams(window.location.search);
  const qp = params.get('t');

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
  if (typeof window === 'undefined') return false;
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
const normalizeFormSchema = (stored: any): FormSchema => {
  if (!stored || !Array.isArray(stored.fields)) {
    return DEFAULT_FORM_SCHEMA;
  }

  const defaultsByKey = new Map(
    DEFAULT_FORM_SCHEMA.fields.map((f) => [f.key, f]),
  );

  const merged: FormFieldConfig[] = stored.fields
    .map((storedField: any) => {
      if (!storedField || typeof storedField !== 'object') return null;
      if (typeof storedField.key !== 'string' || storedField.key === '') {
        return null;
      }

      const def = defaultsByKey.get(storedField.key);

      if (def) {
        return {
          ...def,
          enabled: storedField.enabled ?? def.enabled,
          label: storedField.label || def.label,
          options: Array.isArray(storedField.options)
            ? storedField.options
            : def.options,
        };
      }

      return {
        key: storedField.key,
        label: storedField.label || storedField.key,
        type: storedField.type || 'text',
        enabled: storedField.enabled ?? true,
        builtin: false,
        removable: true,
        options: Array.isArray(storedField.options)
          ? storedField.options
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

  return { fields: merged };
};

// =========================================================
// Message template normalization
// =========================================================
const normalizeMessageTemplate = (raw: any): MessageTemplate => {
  if (!raw || typeof raw !== 'object') return DEFAULT_MESSAGE_TEMPLATE;
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
  v === null || v === undefined || String(v).trim() === '';

const isBlankNum = (v: any): boolean =>
  v === null || v === undefined || v === '';

const pickString = (v: any, fallback: string): string =>
  isBlank(v) ? fallback : String(v);

const pickNumber = (v: any, fallback: number): number => {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// =========================================================
// Build tenant object from a DB row
// =========================================================
const buildTenant = (
  row: any,
  formSchema: FormSchema,
  infoDefaults: Tenant['infoDefaults'],
  effectiveReviews: boolean,
): Tenant => ({
  id: row.id,
  slug: row.slug,

  displayName: pickString(row.display_name, ShopInfo.Shop_name),
  whatsappPhone: pickString(row.whatsapp_phone, ShopInfo.Store_whatsapp),
  bannerUrl: isBlank(row.banner_url)
    ? ShopInfo.Shop_banner || undefined
    : String(row.banner_url),
  storeTagline: pickString(row.store_tagline, ShopInfo.Shop_tagline),
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
});

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

    // Fetch the tenant row + the global ('main') row in parallel
    const [tenantRes, mainRes] = await Promise.all([
      supabase
        .from('star_veg_tenants')
        .select(
          'id, slug, display_name, is_active, whatsapp_phone, owner_phone, form_schema, banner_url, store_tagline, delivery_charge, storewide_discount, message_template, reviews_enabled',
        )
        .eq('slug', slug)
        .maybeSingle(),
      supabase
        .from('star_veg_tenants')
        .select('reviews_enabled')
        .eq('slug', 'main')
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

    // ---- Effective reviews flag ----
    const globalOn = mainRes.data?.reviews_enabled !== false;
    const tenantOn = data.reviews_enabled !== false;
    const effectiveReviews = globalOn && tenantOn;

    const formSchema = normalizeFormSchema(data.form_schema);
    const categoryField = formSchema.fields.find((f) => f.key === 'category');
    const catOptionsEmpty =
      !categoryField?.options || categoryField.options.length === 0;

    // ---- Auto-seed categories from existing items when missing ----
    if (catOptionsEmpty) {
      try {
        const { data: itemRows } = await supabase
          .from('star_veg_menu_items')
          .select('category')
          .eq('tenant_id', data.id);

        if (itemRows && itemRows.length > 0) {
          const seen = new Set<string>();
          itemRows.forEach((r: any) => {
            const c = (r.category ?? '').trim();
            if (c) seen.add(c);
          });

          if (seen.size > 0) {
            const merged = Array.from(seen).sort((a, b) =>
              a.localeCompare(b),
            );
            const seeded: FormSchema = {
              fields: formSchema.fields.map((f) =>
                f.key === 'category' ? { ...f, options: merged } : f,
              ),
            };

            // Persist in the background so it survives next load
            supabaseService
              .updateFormSchema(slug, seeded)
              .catch((e) =>
                console.warn('Failed to persist seeded categories:', e),
              );

            return buildTenant(data, seeded, infoDefaults, effectiveReviews);
          }
        }
      } catch (err) {
        console.warn('Failed to derive categories from items:', err);
      }
    }

    return buildTenant(data, formSchema, infoDefaults, effectiveReviews);
  };

  const refreshTenant = async () => {
    const { slug } = resolveSlugFromUrl();
    if (!slug) return;

    const fresh = await fetchTenant(slug);
    if (fresh) {
      setTenant(fresh);
      setIsDeactivated(fresh.isActive === false);
      setTenantNotFound(false);
    }
  };

  useEffect(() => {
    const smartAdmin = isSmartAdminUrl();
    setIsSmartAdminHost(smartAdmin);

    const { slug, isAdminView: adminView } = resolveSlugFromUrl();
    setIsAdminView(adminView);

    // No slug → main host
    if (!slug) {
      setIsAdminHost(true);
      setTenantNotFound(false);
      setIsLoading(false);
      authService.enforceTenantScope(null, false, smartAdmin);
      return;
    }

    (async () => {
      if (!supabase) {
        console.warn('Supabase not configured — cannot resolve tenant');
        setTenant(null);
        setTenantNotFound(true);
        setIsLoading(false);
        authService.enforceTenantScope(null, false, smartAdmin);
        return;
      }

      const resolved = await fetchTenant(slug);

      if (!resolved) {
        console.warn('Tenant not found:', slug);
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