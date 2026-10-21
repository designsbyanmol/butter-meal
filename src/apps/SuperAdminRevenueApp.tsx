// src/apps/SuperAdminRevenueApp.tsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import SuperAdminSectionApp from './SuperAdminSectionApp';
import RevenueBody from '../components/MainDashboard/RevenueBody';

const SuperAdminRevenueApp: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  // SuperAdminSectionApp handles auth gating + shell
  return (
    <SuperAdminSectionApp
      isAuthenticated={isAuthenticated}
      isLoading={isLoading}
      isPlatformAdmin={!!user?.isPlatformAdmin}
      sectionKey="revenue"
    >
      <RevenueBody />
    </SuperAdminSectionApp>
  );
};

export default SuperAdminRevenueApp;