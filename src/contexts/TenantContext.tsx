// contexts/TenantContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase.client';
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

  /** Field name → true if the current value came from ShopInfo, not the DB. */
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

    const { data, error } = await supabase
      .from('star_veg_tenants')
      .select(
        'id, slug, display_name, is_active, whatsapp_phone, owner_phone, form_schema, banner_url, store_tagline, delivery_charge, storewide_discount, message_template',
      )
      .eq('slug', slug)
      .maybeSingle();

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

    return {
      id: data.id,
      slug: data.slug,

      displayName: pickString(data.display_name, ShopInfo.Shop_name),
      whatsappPhone: pickString(
        data.whatsapp_phone,
        ShopInfo.Store_whatsapp,
      ),
      bannerUrl: isBlank(data.banner_url)
        ? ShopInfo.Shop_banner || undefined
        : String(data.banner_url),
      storeTagline: pickString(data.store_tagline, ShopInfo.Shop_tagline),
      deliveryCharge: pickNumber(
        data.delivery_charge,
        ShopInfo.Delivery_charge,
      ),
      storewideDiscount: pickNumber(
        data.storewide_discount,
        ShopInfo.Storewide_discount,
      ),
      ownerPhone: pickString(data.owner_phone, ShopInfo.Owner_phone),

      isActive: data.is_active,
      formSchema: normalizeFormSchema(data.form_schema),
      messageTemplate: normalizeMessageTemplate(data.message_template),
      infoDefaults,
    };
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

    // No slug → main host (platform admin or smart admin)
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