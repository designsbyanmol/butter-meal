// src/apps/TenantAdminApp.tsx
import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTenant, TenantProvider } from '../contexts/TenantContext';
import { StoreProvider } from '../contexts/StoreContext';
import { authService } from '../services/auth.service';
import TenantAdminShell from '../components/MainDashboard/TenantAdminShell';
import LoginModal from '../components/Auth/LoginModal';
import TenantNotFound from '../components/TenantNotFound/TenantNotFound';
import DashboardSkeleton from '../components/DashboardSkeleton/DashboardSkeleton';
import { seedNewStoreCatalog } from '../utils/seedCatalog';
import { supabase } from '../services/supabase.client';

// Bind auth scope before any hook reads state.
(function bindFromUrlOnce() {
  try {
    const url = new URL(window.location.href);
    const qp = url.searchParams.get('t');
    if (!qp) return;
    const isAdmin = qp.endsWith('_admin');
    const slug = isAdmin ? qp.slice(0, -6) : qp;
    authService.bindTenant(slug, isAdmin, false);
  } catch {
    /* ignore */
  }
})();

const readSlugFromUrl = (): string | null => {
  try {
    const url = new URL(window.location.href);
    const qp = url.searchParams.get('t');
    if (!qp) return null;
    return qp.endsWith('_admin') ? qp.slice(0, -6) : qp;
  } catch {
    return null;
  }
};

/**
 * Inner component - this is where useTenant() actually reads from
 * the TenantProvider mounted above it in the outer wrapper.
 */
const TenantAdminAppInner: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { tenant, isLoading: tenantLoading, tenantNotFound } = useTenant();

  const slug = React.useMemo(() => readSlugFromUrl(), []);

  useEffect(() => {
  if (!tenant) return;
  if (!supabase) return;

  const seedKey = `seed-attempted:${tenant.slug}`;
  try {
    if (sessionStorage.getItem(seedKey) === '1') return;
    sessionStorage.setItem(seedKey, '1');
  } catch {
    /* ignore */
  }

  // Only seed if the store is empty.
  (async () => {
    try {
      const { count } = await supabase
        .from('star_veg_menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id);

      if ((count ?? 0) > 0) return;

      await seedNewStoreCatalog(
        tenant.slug,
        tenant.storeCategory ?? 'food-beverage',
      );
    } catch (err) {
      console.warn('[admin] seed safety net failed:', err);
    }
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tenant?.id]);

  // ── 1. Missing slug ──
  if (!slug) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <h2 style={{ margin: '0 0 8px' }}>Missing store URL</h2>
          <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
            Add <code>?t=your-store_admin</code> to the URL.
          </p>
        </div>
      </div>
    );
  }

  // ── 2. Auth hydrating (~1 frame) ──
  if (authLoading) {
    return <DashboardSkeleton count={6} hideHeader hideBrand hidePill />;
  }

  // ── 3. Not signed in - login. No tenant gate here. ──
  if (!isAuthenticated) {
    const displayName = tenant?.displayName ?? slug;
    return (
      <>
        <div style={{ minHeight: '100vh', background: '#f8fafc' }} />
        <LoginModal
          isOpen={true}
          onClose={() => {}}
          forceOpen={true}
          storeIdentity={{ slug, displayName }}
        />
      </>
    );
  }

  // ── 4. Signed in, tenant loading ──
  if (tenantLoading) {
    return <DashboardSkeleton count={6} hideHeader hideBrand hidePill />;
  }

  // ── 5. Signed in, tenant didn't resolve ──
  if (tenantNotFound || !tenant) {
    return <TenantNotFound />;
  }

  // ── 6. Wrong store ──
  if (
    !user?.isPlatformAdmin &&
    user?.tenantSlug &&
    user.tenantSlug !== slug
  ) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <h2 style={{ margin: '0 0 8px' }}>Wrong store</h2>
          <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
            Your login is for a different store. Sign out to continue.
          </p>
        </div>
      </div>
    );
  }

  // ── 7. Render the shell ──
  return <TenantAdminShell />;
};

/**
 * Outer wrapper - mounts the providers so useTenant() in the inner
 * component reads from an actual provider, not the default context.
 */
const TenantAdminApp: React.FC = () => (
  <TenantProvider>
    <StoreProvider>
      <TenantAdminAppInner />
    </StoreProvider>
  </TenantProvider>
);

export default TenantAdminApp;