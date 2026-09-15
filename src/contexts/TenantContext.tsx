// contexts/TenantContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase.client';
import { authService } from '../services/auth.service';
import {
  FormSchema,
  FormFieldConfig,
  DEFAULT_FORM_SCHEMA,
} from '../types';

export interface Tenant {
  id: string;
  slug: string;
  displayName: string;
  whatsappPhone?: string;
  isActive?: boolean;
  formSchema?: FormSchema;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  isAdminHost: boolean;
  isDeactivated: boolean;
  tenantNotFound: boolean;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isLoading: true,
  isAdminHost: false,
  isDeactivated: false,
  tenantNotFound: false,
  refreshTenant: async () => {},
});

export const useTenant = () => useContext(TenantContext);

const SLUG_STORAGE_KEY = 'restaurant_tenant_slug';

const resolveSlugFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  const qp = params.get('t');

  if (!qp) {
    sessionStorage.removeItem(SLUG_STORAGE_KEY);
    return null;
  }

  sessionStorage.setItem(SLUG_STORAGE_KEY, qp.trim());
  return qp.trim();
};

/**
 * Merge a stored schema (possibly from an older app version) with the
 * current defaults.
 *
 * - Built-in fields inherit `locked`, `builtin`, `removable`, and `type`
 *   from DEFAULT_FORM_SCHEMA, so newly-added flags like `locked: true`
 *   apply even to old tenants. The tenant's `enabled` and `label` are
 *   preserved.
 * - Custom fields pass through as-is.
 * - Any default built-in missing from the stored schema is appended so
 *   the tenant always has every standard field available.
 */
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

      // Built-in — inherit identity + locking from the current defaults
      if (def) {
  return {
    ...def,                          // ← brings in `locked: true` and type
    enabled: storedField.enabled ?? def.enabled,
    label: storedField.label || def.label,
    options: Array.isArray(storedField.options)
      ? storedField.options
      : def.options,
  };
}

      // Custom field — pass through
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

  // Ensure every default built-in exists (in case the stored schema
  // predates a built-in field)
  const presentKeys = new Set(merged.map((f) => f.key));
  DEFAULT_FORM_SCHEMA.fields.forEach((def) => {
    if (!presentKeys.has(def.key)) {
      merged.push({ ...def });
    }
  });

  return { fields: merged };
};

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminHost, setIsAdminHost] = useState(false);
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [tenantNotFound, setTenantNotFound] = useState(false);

  const fetchTenant = async (slug: string): Promise<Tenant | null> => {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('star_veg_tenants')
      .select('id, slug, display_name, is_active, whatsapp_phone, form_schema')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      slug: data.slug,
      displayName: data.display_name,
      whatsappPhone: data.whatsapp_phone || undefined,
      isActive: data.is_active,
      formSchema: normalizeFormSchema(data.form_schema),
    };
  };

  const refreshTenant = async () => {
    const slug = resolveSlugFromUrl();
    if (!slug) return;

    const fresh = await fetchTenant(slug);
    if (fresh) {
      setTenant(fresh);
      setIsDeactivated(fresh.isActive === false);
      setTenantNotFound(false);
    }
  };

  useEffect(() => {
    const slug = resolveSlugFromUrl();

    // No slug → main host (platform admin)
    if (!slug) {
      setIsAdminHost(true);
      setTenantNotFound(false);
      setIsLoading(false);
      authService.enforceTenantScope(null);
      return;
    }

    (async () => {
      if (!supabase) {
        console.warn('Supabase not configured — cannot resolve tenant');
        setTenant(null);
        setTenantNotFound(true);
        setIsLoading(false);
        authService.enforceTenantScope(null);
        return;
      }

      const resolved = await fetchTenant(slug);

      if (!resolved) {
        console.warn('Tenant not found:', slug);
        setTenant(null);
        setIsDeactivated(false);
        setTenantNotFound(true);
        authService.enforceTenantScope(null);
      } else {
        setTenant(resolved);
        setIsDeactivated(resolved.isActive === false);
        setTenantNotFound(false);
        authService.enforceTenantScope(resolved.slug);
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
        isDeactivated,
        tenantNotFound,
        refreshTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};