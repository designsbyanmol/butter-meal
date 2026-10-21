import React from 'react';
import { useAuth } from '../hooks/useAuth';
import SuperAdminSectionApp from './SuperAdminSectionApp';
import TenantManagerBody from '../components/Admin/TenantManagerBody';

const SuperAdminStoresApp: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  return (
    <SuperAdminSectionApp
      isAuthenticated={isAuthenticated}
      isLoading={isLoading}
      isPlatformAdmin={!!user?.isPlatformAdmin}
      sectionKey="stores"
    >
      <TenantManagerBody />
    </SuperAdminSectionApp>
  );
};

export default SuperAdminStoresApp;