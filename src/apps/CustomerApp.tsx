// src/apps/CustomerApp.tsx
import React, { useEffect, useState } from 'react';
import { TenantProvider, useTenant } from '../contexts/TenantContext';
import { StoreProvider, useStore } from '../contexts/StoreContext';
import { useMenu } from '../hooks/useMenu';
import AppContent from '../AppContent';
import HospitalCustomerApp from './HospitalCustomerApp'; 
import TenantNotFound from '../components/TenantNotFound/TenantNotFound';
import Preloader from '../components/Preloader/Preloader';
import { useBackendOnline } from '../hooks/useBackendOnline';

const CustomerInner: React.FC = () => {
  const { tenant, isLoading: tenantLoading, tenantNotFound } = useTenant();
  const { isLoading: storeLoading } = useStore();
  const { loading: menuLoading } = useMenu();

  const [minElapsed, setMinElapsed] = useState(false);
const online = useBackendOnline();
  // If it's a hospital, we don't need to wait for the menu to load
  const isHospital = tenant?.storeCategory === 'hospital-pharmacy';
  
  // Wait for tenant loading to finish first
  const appReady = isHospital 
    ? !tenantLoading && !storeLoading 
    : !tenantLoading && !storeLoading && !menuLoading;

  if (!minElapsed || !appReady) {
    return (
      <Preloader
        title="Loading store..."
        onReady={() => setMinElapsed(true)}
      />
    );
  }

if (tenantNotFound) {
    return <TenantNotFound reason={online ? 'not-found' : 'connection'} />;
  }
  
  // Render Hospital App if category matches
  if (isHospital) {
    return <HospitalCustomerApp />;
  }

  return <AppContent />;
};

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