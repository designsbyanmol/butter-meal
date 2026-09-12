// contexts/TenantContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase.client';
import { authService } from '../services/auth.service';

export interface Tenant {
  id: string;
  slug: string;
  displayName: string;
  whatsappPhone?: string;
  isActive?: boolean;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  isAdminHost: boolean;
  isDeactivated: boolean;
  tenantNotFound: boolean;   // ✅ new
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isLoading: true,
  isAdminHost: false,
  isDeactivated: false,
  tenantNotFound: false,
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

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminHost, setIsAdminHost] = useState(false);
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [tenantNotFound, setTenantNotFound] = useState(false);

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

      const { data, error } = await supabase
        .from('star_veg_tenants')
        .select('id, slug, display_name, is_active, whatsapp_phone')
        .eq('slug', slug)
        .maybeSingle();

      if (error || !data) {
        // Slug was in the URL but the tenant doesn't exist
        console.warn('Tenant not found:', slug, error);
        setTenant(null);
        setIsDeactivated(false);
        setTenantNotFound(true);
        authService.enforceTenantScope(null);
      } else {
        setTenant({
          id: data.id,
          slug: data.slug,
          displayName: data.display_name,
          whatsappPhone: data.whatsapp_phone || undefined,
          isActive: data.is_active,
        });
        setIsDeactivated(data.is_active === false);
        setTenantNotFound(false);
        authService.enforceTenantScope(data.slug);
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
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};