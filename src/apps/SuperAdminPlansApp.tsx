// src/apps/SuperAdminPlansApp.tsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import SuperAdminSectionApp from './SuperAdminSectionApp';
import PlansModalBody from '../components/MainDashboard/Modals/PlansModalBody';

const SuperAdminPlansApp: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  return (
    <SuperAdminSectionApp
      isAuthenticated={isAuthenticated}
      isLoading={isLoading}
      isPlatformAdmin={!!user?.isPlatformAdmin}
      sectionKey="plans"
    >
      <PlansModalBody />
    </SuperAdminSectionApp>
  );
};

export default SuperAdminPlansApp;