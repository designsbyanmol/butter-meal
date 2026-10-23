// src/apps/CustomerApp.tsx
import React, { useEffect, useState } from 'react';
import { TenantProvider, useTenant } from '../contexts/TenantContext';
import { StoreProvider, useStore } from '../contexts/StoreContext';
import { useMenu } from '../hooks/useMenu';
import AppContent from '../AppContent';
import TenantNotFound from '../components/TenantNotFound/TenantNotFound';
import Preloader from '../components/Preloader/Preloader';

/**
 * Inner component — reads loading state from the three contexts
 * that gate the customer page. Unmounts the preloader only when
 * BOTH the minimum time has elapsed AND every context is loaded.
 */
const CustomerInner: React.FC = () => {
  const { isLoading: tenantLoading, tenantNotFound } = useTenant();
  const { isLoading: storeLoading } = useStore();
  const { loading: menuLoading } = useMenu();

  const [minElapsed, setMinElapsed] = useState(false);

  // Once the preloader's own timer fires, the app takes over.
  const appReady = !tenantLoading && !storeLoading && !menuLoading;

if (!minElapsed || !appReady) {
  return (
    <Preloader
      title="Loading your store..."
      onReady={() => setMinElapsed(true)}
    />
  );
}

  if (tenantNotFound) {
    return <TenantNotFound />;
  }

  return <AppContent />;
};

/**
 * Public entry — mounts providers then the inner component.
 */
const CustomerApp: React.FC = () => {
  return (
    <TenantProvider>
      <StoreProvider>
        <CustomerInner />
      </StoreProvider>
    </TenantProvider>
  );
};

export default CustomerApp;