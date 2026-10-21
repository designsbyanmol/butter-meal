// src/apps/CustomerApp.tsx
import React from 'react';
import { TenantProvider, useTenant } from '../contexts/TenantContext';
import { StoreProvider } from '../contexts/StoreContext';
import AppContent from '../AppContent';
import TenantNotFound from '../components/TenantNotFound/TenantNotFound';
import DashboardSkeleton from '../components/DashboardSkeleton/DashboardSkeleton';

const CustomerInner: React.FC = () => {
  const { isLoading, tenantNotFound, tenant } = useTenant();

  if (isLoading) {
    return <DashboardSkeleton count={6} hideHeader hideBrand hidePill />;
  }

  if (tenantNotFound || !tenant) {
    return <TenantNotFound />;
  }

  return <AppContent />;
};

const CustomerApp: React.FC = () => (
  <TenantProvider>
    <StoreProvider>
      <CustomerInner />
    </StoreProvider>
  </TenantProvider>
);

export default CustomerApp;